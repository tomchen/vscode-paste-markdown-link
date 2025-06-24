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

  // Check if selection is inside an existing markdown link (or image)
  const regex = new RegExp(
    MARKDOWN_LINK_PATTERN.source,
    MARKDOWN_LINK_PATTERN.flags,
  )
  let match: RegExpExecArray | null
  while ((match = regex.exec(lineText)) !== null) {
    const linkStart = match.index
    const linkEnd = match.index + match[0].length

    // Check if selection overlaps with the markdown link (or image)
    if (
      selection.start.character < linkEnd &&
      selection.end.character > linkStart
    ) {
      return false
    }
  }

  return true
}

/**
 * Paste the clipboard text as a Markdown link or image.
 * @param forced - If true, use forced mode.
 * @param isImg - If true, paste the clipboard text as a Markdown image.
 *
 * Detailed flow:
 * - If the clipboard is empty:
 *    – Do nothing
 * - If not `forced`:
 *    - If there is `selectedText`, `isSelectionValid()` returns `true`, and `clipboardText` is a URL:
 *      → Paste a Markdown link using `selectedText` as the label
 *    - Any other cases:
 *      → Paste the clipboard text as-is
 * - If `forced`:
 *    - If there is no `selectedText`:
 *      → Paste `[](${clipboardText})` (or `![](${clipboardText})` if it's an image URL),
 *      → and place the cursor inside "[" and "]"
 *    - If there is `selectedText` (regardless of `isSelectionValid()`'s result):
 *      → Paste a Markdown link or image using `selectedText` as the label
 */
function paste(forced: boolean = false, isImg: boolean = false) {
  return async () => {
    try {
      const editor = vscode.window.activeTextEditor
      if (!editor) {
        console.log('No active editor')
        return
      }

      const clipboardText = await vscode.env.clipboard.readText()

      // If the clipboard is empty, do nothing
      if (!clipboardText.trim()) {
        return
      }

      const selections = editor.selections
      if (selections.length === 0) {
        console.log('No selections found')
        return
      }

      // Process each selection according to the new flow logic
      let actualReplacementText: string = ''
      await editor.edit((editBuilder) => {
        for (const selection of selections) {
          const selectedText = editor.document.getText(selection)
          const isValid = isSelectionValid(selection, editor.document)

          let replacementText: string

          if (!forced) {
            // Not forced mode
            if (selectedText && isValid && URL_PATTERN.test(clipboardText)) {
              // Valid selection with text and clipboard is URL - create markdown link
              replacementText = `${isImg ? '!' : ''}[${selectedText}](${clipboardText})`
            } else {
              // Any other case - paste clipboard text as-is
              replacementText = clipboardText
            }
          } else {
            // Forced mode
            if (!selectedText) {
              // No selected text - create placeholder markdown link
              replacementText = `${isImg ? '!' : ''}[](${clipboardText})`
            } else {
              // Has selected text (regardless of validity) - create markdown link
              replacementText = `${isImg ? '!' : ''}[${selectedText}](${clipboardText})`
            }
          }

          actualReplacementText = replacementText
          editBuilder.replace(selection, replacementText)
        }
      })

      // Update cursor position for the last selection using the actual replacement text
      const lastSelection = selections[selections.length - 1]
      const startLine = lastSelection.start.line
      const startChar = lastSelection.start.character
      const selectedText = editor.document.getText(lastSelection)

      const replacementLines = actualReplacementText.split('\n')
      const lastLine = startLine + replacementLines.length - 1
      const lastLineLength =
        replacementLines[replacementLines.length - 1].length

      // Place cursor at the end of the pasted text, or inside brackets for placeholder links
      let newPosition: vscode.Position
      if (forced && !selectedText) {
        // Position cursor inside the brackets for placeholder links
        const prefixLength = isImg ? 1 : 0 // "!" for images, nothing for links
        const bracketStart = startChar + prefixLength + 1 // +1 for the opening "["
        newPosition = new vscode.Position(startLine, bracketStart)
      } else {
        // Place cursor at the end of the pasted text
        newPosition = new vscode.Position(lastLine, startChar + lastLineLength)
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
    paste(true),
  )

  let disposableImg = vscode.commands.registerCommand(
    'paste-markdown-link.paste-img',
    paste(true, true),
  )

  context.subscriptions.push(disposable, disposableNocheck, disposableImg)
}

export function deactivate() {}
