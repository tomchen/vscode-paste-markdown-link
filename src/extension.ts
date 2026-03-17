import * as vscode from 'vscode'

export const URL_PATTERN =
  /^(https?|ftps?|file|sftp|ssh|scp|mailto|tel|sms|callto|magnet|torrent|ed2k|thunder|dchub|dcpp|irc|ircs|news|nntp|git|svn|hg|data|blob|ipfs|ipns|chrome|chrome-extension|about|resource|moz-extension|ws|wss|vscode|cursor):(\/\/)?[^\s]+$/

// Inline links/images: [text](url) or ![text](url)
// Supports nested brackets in link text and balanced parentheses in URLs (one level deep)
export const MARKDOWN_INLINE_PATTERN =
  /!?\[(?:[^\[\]]|\[[^\]]*\])*\]\((?:[^()]|\([^)]*\))*\)/g

// Reference-style links/images: [text][id] or ![text][id] or [text][] or ![text][]
export const MARKDOWN_REF_PATTERN = /!?\[(?:[^\[\]]|\[[^\]]*\])*\]\[[^\]]*\]/g

/**
 * Mask content inside inline code spans so that markdown patterns
 * inside backticks are not detected as links/images.
 * Preserves string length so character positions remain valid.
 * Pure function.
 */
export function maskCodeSpans(text: string): string {
  return text.replace(
    /(`+)([\s\S]*?)\1/g,
    (_match, ticks: string, content: string) => {
      return ticks + ' '.repeat(content.length) + ticks
    },
  )
}

/**
 * Check if a selection range on a single line is valid for markdown link wrapping.
 * Returns false if the selection overlaps with existing markdown links,
 * or partially overlaps with markdown images.
 * Markdown patterns inside code spans (backticks) are ignored.
 * Pure function — no VS Code dependency.
 */
export function isLineSelectionValid(
  lineText: string,
  selectionStart: number,
  selectionEnd: number,
): boolean {
  const maskedText = maskCodeSpans(lineText)

  const allMatches = [
    ...maskedText.matchAll(MARKDOWN_INLINE_PATTERN),
    ...maskedText.matchAll(MARKDOWN_REF_PATTERN),
  ]

  for (const match of allMatches) {
    const matchStart = match.index!
    const matchEnd = match.index! + match[0].length

    if (!match[0].startsWith('!')) {
      // Regular link — any overlap with selection is invalid
      if (selectionStart < matchEnd && selectionEnd > matchStart) {
        return false
      }
    } else {
      // Image — partial overlap is invalid, but complete containment is ok
      const hasOverlap = selectionStart < matchEnd && selectionEnd > matchStart
      const completelyContains =
        selectionStart <= matchStart && selectionEnd >= matchEnd
      if (hasOverlap && !completelyContains) {
        return false
      }
    }
  }

  return true
}

function isSelectionValid(
  selection: vscode.Selection,
  document: vscode.TextDocument,
): boolean {
  if (selection.start.line !== selection.end.line) {
    return false
  }

  return isLineSelectionValid(
    document.lineAt(selection.start.line).text,
    selection.start.character,
    selection.end.character,
  )
}

/**
 * Build the replacement text for a paste operation.
 * Pure function — no VS Code dependency.
 */
export function buildReplacementText(
  selectedText: string,
  clipboardText: string,
  isValid: boolean,
  forced: boolean,
  isImg: boolean,
): string {
  if (!forced) {
    if (selectedText && isValid && URL_PATTERN.test(clipboardText)) {
      return `[${selectedText}](${clipboardText})`
    }
    return clipboardText
  }
  if (!selectedText) {
    return `${isImg ? '!' : ''}[](${clipboardText})`
  }
  const cleanedSelectedText = selectedText.replace(/\n/g, ' ')
  return `${isImg ? '!' : ''}[${cleanedSelectedText}](${clipboardText})`
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
        return
      }

      const clipboardText = await vscode.env.clipboard.readText()

      // If the clipboard is empty, do nothing
      if (!clipboardText.trim()) {
        return
      }

      const selections = editor.selections
      if (selections.length === 0) {
        return
      }

      // Process each selection according to the flow logic
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

          const replacementText = buildReplacementText(
            selectedText,
            clipboardText,
            isValid,
            forced,
            isImg,
          )

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
      // Sort selections by document position to correctly calculate adjustments
      const sortedSelections = [...selections].sort((a, b) => {
        if (a.start.line !== b.start.line) {
          return a.start.line - b.start.line
        }
        return a.start.character - b.start.character
      })

      // Find the last selection in the array and calculate deltas from
      // selections that appear before it in the document
      const lastSelection = selections[selections.length - 1]
      let lineDelta = 0
      let charDelta = 0

      for (const selection of sortedSelections) {
        if (selection === lastSelection) {
          break // Stop when we reach the last selection
        }

        // Only count deltas from selections that appear before the last selection in the document
        if (
          selection.start.line < lastSelection.start.line ||
          (selection.start.line === lastSelection.start.line &&
            selection.start.character < lastSelection.start.character)
        ) {
          const info = selectionReplacements.get(selection)!
          const originalLines = info.originalText.split('\n').length - 1
          const replacementLines = info.replacementText.split('\n').length - 1
          lineDelta += replacementLines - originalLines

          // Accumulate character delta for single-line prior selections on the same line
          if (
            selection.end.line === lastSelection.start.line &&
            originalLines === 0 &&
            replacementLines === 0
          ) {
            charDelta += info.replacementText.length - info.originalText.length
          }
        }
      }

      // Adjust the position based on changes from earlier edits
      const adjustedLine = lastSelectionStart.line + lineDelta
      const startChar = lastSelectionStart.character + charDelta
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
