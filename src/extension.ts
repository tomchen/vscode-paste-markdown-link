import * as vscode from 'vscode'

const URL_PATTERN =
  /^(https?|ftps?|file|sftp|ssh|scp|mailto|tel|sms|callto|magnet|torrent|ed2k|thunder|dchub|dcpp|irc|ircs|news|nntp|git|svn|hg|data|blob|ipfs|ipns|chrome|chrome-extension|about|resource|moz-extension|ws|wss|vscode|cursor):(\/\/)?[^\s]+$/

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
      const selection = editor.selection
      const selectedText = editor.document.getText(selection)

      // console.log(`Clipboard text: ${clipboardText}`);
      // console.log(`Selected text: ${selectedText}`);

      const rep =
        ((checkUrl && URL_PATTERN.test(clipboardText)) || !checkUrl) &&
        selectedText
          ? `${isImg ? '!' : ''}[${selectedText}](${clipboardText})`
          : clipboardText

      await editor.edit((editBuilder) => {
        editBuilder.replace(selection, rep)
      })

      // Calculate new cursor position after replacement
      const startLine = selection.start.line
      const startChar = selection.start.character
      const repLines = rep.split('\n')
      const lastLine = startLine + repLines.length - 1
      const lastLineLength = startChar + repLines[repLines.length - 1].length

      // Place cursor at the end of the pasted text
      const newPosition = new vscode.Position(lastLine, lastLineLength)
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
