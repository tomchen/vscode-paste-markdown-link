import * as vscode from 'vscode'

const URL_PATTERN =
  /^(https?|ftps?|file|sftp|ssh|scp|mailto|tel|sms|callto|magnet|torrent|ed2k|thunder|dchub|dcpp|irc|ircs|news|nntp|git|svn|hg|data|blob|ipfs|ipns|chrome|chrome-extension|about|resource|moz-extension|ws|wss|vscode|cursor):(\/\/)?[^\s]+$/

// Pattern to detect existing markdown links and images
const MARKDOWN_LINK_PATTERN = /!?\[([^\]]*)\]\(([^)]+)\)/g

function isSelectionValid(
  selection: vscode.Selection,
  document: vscode.TextDocument,
): boolean {
  // Check if selection is on a single line
  if (selection.start.line !== selection.end.line) {
    return false
  }

  // Get the line text
  const lineText = document.lineAt(selection.start.line).text

  // Check if selection is inside an existing markdown link
  const regex = new RegExp(
    MARKDOWN_LINK_PATTERN.source,
    MARKDOWN_LINK_PATTERN.flags,
  )
  let match: RegExpExecArray | null
  while ((match = regex.exec(lineText)) !== null) {
    const linkStart = match.index
    const linkEnd = match.index + match[0].length

    // Check if selection overlaps with the markdown link
    if (
      selection.start.character < linkEnd &&
      selection.end.character > linkStart
    ) {
      return false
    }
  }

  return true
}

function paste(checkUrl: boolean = true, isImg: boolean = false) {
  return async () => {
    try {
      // console.log("Command executed");
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        console.log('No active editor')
        return
      }

      // console.log(`Current language: ${editor.document.languageId}`);
      // console.log(`Has selection: ${!editor.selection.isEmpty}`);

      const clipboardText = await vscode.env.clipboard.readText()
      const selections = editor.selections

      if (selections.length === 0) {
        console.log('No selections found')
        return
      }

      // Process each selection - valid ones get markdown formatting, invalid ones get clipboard text as-is
      await editor.edit((editBuilder) => {
        for (const selection of selections) {
          const selectedText = editor.document.getText(selection)
          const isValid = isSelectionValid(selection, editor.document)

          let rep: string
          if (isValid && selectedText) {
            // Valid selection with text - apply markdown link formatting
            rep =
              (checkUrl && URL_PATTERN.test(clipboardText)) || !checkUrl
                ? `${isImg ? '!' : ''}[${selectedText}](${clipboardText})`
                : clipboardText
          } else if (!checkUrl && !selectedText) {
            // No text selected and no URL check - create markdown link with placeholder
            rep = `${isImg ? '!' : ''}[](${clipboardText})`
          } else {
            // Invalid selection or no selected text - paste clipboard text as-is
            rep = clipboardText
          }

          editBuilder.replace(selection, rep)
        }
      })

      // Update cursor position for the last selection
      const lastSelection = selections[selections.length - 1]
      const startLine = lastSelection.start.line
      const startChar = lastSelection.start.character
      const selectedText = editor.document.getText(lastSelection)
      const isValid = isSelectionValid(lastSelection, editor.document)

      let rep: string
      if (isValid && selectedText) {
        rep =
          (checkUrl && URL_PATTERN.test(clipboardText)) || !checkUrl
            ? `${isImg ? '!' : ''}[${selectedText}](${clipboardText})`
            : clipboardText
      } else if (!checkUrl && !selectedText) {
        // No text selected and no URL check - create markdown link with placeholder
        rep = `${isImg ? '!' : ''}[](${clipboardText})`
      } else {
        rep = clipboardText
      }

      const repLines = rep.split('\n')
      const lastLine = startLine + repLines.length - 1
      const lastLineLength = startChar + repLines[repLines.length - 1].length

      // Place cursor at the end of the pasted text, or inside brackets for placeholder links
      let newPosition: vscode.Position
      if (!checkUrl && !selectedText) {
        // Position cursor inside the brackets for placeholder links
        const prefixLength = isImg ? 1 : 0 // "!" for images, nothing for links
        const bracketStart = startChar + prefixLength + 1 // +1 for the opening "["
        newPosition = new vscode.Position(startLine, bracketStart)
      } else {
        // Place cursor at the end of the pasted text
        newPosition = new vscode.Position(lastLine, lastLineLength)
      }

      editor.selection = new vscode.Selection(newPosition, newPosition)
    } catch (error) {
      console.error('Error in command:', error)
      vscode.window.showErrorMessage(
        'Error executing paste markdown link command',
      )
    }
  }
}

export function activate(context: vscode.ExtensionContext) {
  // console.log('Extension "paste-markdown-link" is now active!');

  let disposable = vscode.commands.registerCommand(
    'paste-markdown-link.paste',
    paste(),
  )

  let disposableNocheck = vscode.commands.registerCommand(
    'paste-markdown-link.paste-nocheck',
    paste(false),
  )

  let disposableImg = vscode.commands.registerCommand(
    'paste-markdown-link.paste-img',
    paste(false, true),
  )

  context.subscriptions.push(disposable, disposableNocheck, disposableImg)
}

export function deactivate() {}
