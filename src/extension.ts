import * as vscode from 'vscode'

const URL_PATTERN =
  /^(https?|ftps?|file|sftp|ssh|scp|mailto|tel|sms|callto|magnet|torrent|ed2k|thunder|dchub|dcpp|irc|ircs|news|nntp|git|svn|hg|data|blob|ipfs|ipns|chrome|chrome-extension|about|resource|moz-extension|ws|wss|vscode|cursor):(\/\/)?[^\s]+$/

// Pattern to detect existing markdown links and images
// Updated to handle nested structures like [![image](url)](link)
const MARKDOWN_LINK_PATTERN = /!?\[(?:[^\[\]]|\[[^\]]*\])*\]\([^)]+\)/g

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
 *      → Paste a Markdown link or image using `selectedText` as the label (newlines will be replaced with spaces)
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
      let lastSelectionOriginalText: string = ''
      let lastSelectionStart: vscode.Position =
        selections[selections.length - 1].start

      // Create a map to track replacement info for each selection
      const selectionReplacements = new Map<
        vscode.Selection,
        {
          originalText: string
          replacementText: string
        }
      >()

      await editor.edit((editBuilder) => {
        for (let i = 0; i < selections.length; i++) {
          const selection = selections[i]
          const selectedText = editor.document.getText(selection)
          const isValid = isSelectionValid(selection, editor.document)

          let replacementText: string

          if (!forced) {
            // Not forced mode
            if (selectedText && isValid && URL_PATTERN.test(clipboardText)) {
              // Valid selection with text and clipboard is URL - create markdown link
              replacementText = `${
                isImg ? '!' : ''
              }[${selectedText}](${clipboardText})`
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
              // Replace newlines with spaces in selectedText for forced mode
              const cleanedSelectedText = selectedText.replace(/\n/g, ' ')
              replacementText = `${
                isImg ? '!' : ''
              }[${cleanedSelectedText}](${clipboardText})`
            }
          }

          // Store replacement info for all selections
          selectionReplacements.set(selection, {
            originalText: selectedText,
            replacementText: replacementText,
          })

          // Store info for the last selection in the array
          if (i === selections.length - 1) {
            actualReplacementText = replacementText
            lastSelectionOriginalText = selectedText
          }

          editBuilder.replace(selection, replacementText)
        }
      })

      // Calculate cursor position for the last selection after all edits are complete
      // Sort selections by document position to correctly calculate line adjustments
      const sortedSelections = [...selections].sort((a, b) => {
        if (a.start.line !== b.start.line) {
          return a.start.line - b.start.line
        }
        return a.start.character - b.start.character
      })

      // Find the last selection in the array and calculate line delta from selections that appear before it in the document
      const lastSelection = selections[selections.length - 1]
      let lineDelta = 0

      for (const selection of sortedSelections) {
        if (selection === lastSelection) {
          break // Stop when we reach the last selection
        }

        // Only count line deltas from selections that appear before the last selection in the document
        if (
          selection.start.line < lastSelection.start.line ||
          (selection.start.line === lastSelection.start.line &&
            selection.start.character < lastSelection.start.character)
        ) {
          const info = selectionReplacements.get(selection)!
          const originalLines = info.originalText.split('\n').length - 1
          const replacementLines = info.replacementText.split('\n').length - 1
          lineDelta += replacementLines - originalLines
        }
      }

      // Adjust the line position based on changes from earlier edits
      const adjustedLine = lastSelectionStart.line + lineDelta
      const startChar = lastSelectionStart.character
      const replacementLines = actualReplacementText.split('\n')

      // Calculate the final position considering the replacement text
      let finalLine = adjustedLine
      let finalChar = startChar

      if (replacementLines.length > 1) {
        // Multi-line replacement: cursor goes to end of last line
        finalLine = adjustedLine + replacementLines.length - 1
        finalChar = replacementLines[replacementLines.length - 1].length
      } else {
        // Single-line replacement: cursor goes to end of replacement text
        finalChar = startChar + replacementLines[0].length
      }

      // Place cursor at the end of the pasted text, or inside brackets for placeholder links
      let newPosition: vscode.Position
      if (forced && !lastSelectionOriginalText) {
        // Position cursor inside the brackets for placeholder links
        const prefixLength = isImg ? 1 : 0 // "!" for images, nothing for links
        const bracketStart = startChar + prefixLength + 1 // +1 for the opening "["
        newPosition = new vscode.Position(adjustedLine, bracketStart)
      } else {
        // Place cursor at the end of the pasted text
        newPosition = new vscode.Position(finalLine, finalChar)
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
