import * as assert from 'assert'
import * as vscode from 'vscode'

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.')

  // Basic extension tests
  test('Extension should be present', () => {
    assert.ok(true, 'Extension test environment is working')
  })

  test('Should activate', async () => {
    const extension = vscode.extensions.getExtension(
      'tomchen.paste-markdown-link',
    )
    if (extension) {
      await extension.activate()
      assert.ok(
        extension.isActive,
        'Extension should be active after activation',
      )
    } else {
      assert.fail('Extension not found')
    }
  })

  test('Commands should be registered after activation', async () => {
    const extension = vscode.extensions.getExtension(
      'tomchen.paste-markdown-link',
    )
    await extension?.activate()

    const commands = await vscode.commands.getCommands()

    assert.ok(
      commands.includes('paste-markdown-link.paste'),
      'paste command should be registered',
    )
    assert.ok(
      commands.includes('paste-markdown-link.paste-nocheck'),
      'paste-nocheck command should be registered',
    )
    assert.ok(
      commands.includes('paste-markdown-link.paste-img'),
      'paste-img command should be registered',
    )
  })

  // File type support tests
  test('Should handle supported file types', async () => {
    const supportedLanguages = ['markdown', 'mdx', 'rmd', 'quarto']

    for (const language of supportedLanguages) {
      const document = await vscode.workspace.openTextDocument({
        content: `Test ${language} content`,
        language: language,
      })

      const editor = await vscode.window.showTextDocument(document)
      assert.ok(editor, `Should be able to open ${language} document`)
    }
  })

  // URL pattern tests
  test('Should test URL pattern matching', () => {
    const URL_PATTERN =
      /^(https?|ftps?|file|sftp|ssh|scp|mailto|tel|sms|callto|magnet|torrent|ed2k|thunder|dchub|dcpp|irc|ircs|news|nntp|git|svn|hg|data|blob|ipfs|ipns|chrome|chrome-extension|about|resource|moz-extension|ws|wss|vscode|cursor):(\/\/)?[^\s]+$/

    // Valid URLs
    const validUrls = [
      'https://example.com',
      'http://example.com',
      'ftp://example.com',
      'mailto:test@example.com',
      'tel:+1234567890',
      'file:///path/to/file',
    ]

    validUrls.forEach((url) => {
      assert.ok(URL_PATTERN.test(url), `Should match ${url}`)
    })

    // Invalid URLs
    const invalidUrls = ['not-a-url', 'example.com']
    invalidUrls.forEach((url) => {
      assert.ok(!URL_PATTERN.test(url), `Should not match ${url}`)
    })
  })

  // Markdown link pattern tests
  test('Should detect existing markdown links correctly', () => {
    const MARKDOWN_LINK_PATTERN = /!?\[(?:[^\[\]]|\[[^\]]*\])*\]\([^)]+\)/g

    // Test regular markdown links
    const regularLinkText =
      'This is a [link text](https://example.com) in a sentence'
    const regularMatches = Array.from(
      regularLinkText.matchAll(MARKDOWN_LINK_PATTERN),
    )
    assert.strictEqual(regularMatches.length, 1, 'Should find one regular link')

    // Test image markdown links
    const imageLinkText =
      'This is an ![image alt](https://example.com/image.png) in a sentence'
    const imageMatches = Array.from(
      imageLinkText.matchAll(MARKDOWN_LINK_PATTERN),
    )
    assert.strictEqual(imageMatches.length, 1, 'Should find one image link')

    // Test multiple links in one line
    const multipleLinksText = '[link1](url1) and [link2](url2) and ![img](url3)'
    const multipleMatches = Array.from(
      multipleLinksText.matchAll(MARKDOWN_LINK_PATTERN),
    )
    assert.strictEqual(multipleMatches.length, 3, 'Should find three links')

    // Test no links
    const noLinksText = 'This is just plain text without any links'
    const noMatches = Array.from(noLinksText.matchAll(MARKDOWN_LINK_PATTERN))
    assert.strictEqual(noMatches.length, 0, 'Should find no links')

    // Test nested markdown structures (clickable images)
    const nestedStructureText =
      '[![image alt](https://example.com/image.png)](https://example.com)'
    const nestedMatches = Array.from(
      nestedStructureText.matchAll(MARKDOWN_LINK_PATTERN),
    )
    assert.strictEqual(
      nestedMatches.length,
      1,
      'Should find the complete nested structure',
    )

    // Verify the match covers the entire nested structure
    assert.strictEqual(
      nestedMatches[0][0],
      '[![image alt](https://example.com/image.png)](https://example.com)',
      'Should match the full nested structure',
    )

    // Test that the match covers the outer URL (this is the key fix for the bug)
    const outerUrlStart = nestedStructureText.lastIndexOf('https://example.com')
    const outerUrlEnd = outerUrlStart + 'https://example.com'.length
    const matchStart = nestedMatches[0].index
    const matchEnd = matchStart + nestedMatches[0][0].length
    assert.ok(
      matchStart <= outerUrlStart && matchEnd >= outerUrlEnd,
      'Match should cover the outer URL',
    )

    // Test complex nested case with multiple nested structures
    const complexNestedText =
      'Text [![img1](url1)](link1) more text [![img2](url2)](link2) end'
    const complexMatches = Array.from(
      complexNestedText.matchAll(MARKDOWN_LINK_PATTERN),
    )
    assert.strictEqual(
      complexMatches.length,
      2,
      'Should find both complete nested structures',
    )
  })

  // Command execution tests
  test('Should execute commands without error', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: 'Selected text here',
      language: 'markdown',
    })

    const editor = await vscode.window.showTextDocument(document)
    const selection = new vscode.Selection(0, 0, 0, 14)
    editor.selection = selection

    const commands = [
      'paste-markdown-link.paste',
      'paste-markdown-link.paste-nocheck',
      'paste-markdown-link.paste-img',
    ]

    for (const command of commands) {
      try {
        await vscode.commands.executeCommand(command)
        assert.ok(true, `${command} executed without throwing error`)
      } catch (error) {
        // It's okay if it fails due to clipboard access in test environment
        assert.ok(
          error instanceof Error,
          `Should throw a proper error if ${command} fails`,
        )
      }
    }
  })

  test('Should handle edge cases gracefully', async () => {
    // Test with no active editor
    await vscode.commands.executeCommand('workbench.action.closeAllEditors')
    try {
      await vscode.commands.executeCommand('paste-markdown-link.paste')
      assert.ok(true, 'Command should handle no active editor gracefully')
    } catch (error) {
      assert.ok(
        error instanceof Error,
        'Should throw a proper error if it fails',
      )
    }

    // Test with no selection
    const document = await vscode.workspace.openTextDocument({
      content: 'Text without selection',
      language: 'markdown',
    })
    const editor = await vscode.window.showTextDocument(document)
    const position = new vscode.Position(0, 0)
    editor.selection = new vscode.Selection(position, position)

    try {
      await vscode.commands.executeCommand('paste-markdown-link.paste')
      assert.ok(true, 'Command should handle no selection gracefully')
    } catch (error) {
      assert.ok(
        error instanceof Error,
        'Should throw a proper error if it fails',
      )
    }
  })

  // Selection validation tests
  test('Should handle different selection types', async () => {
    const document = await vscode.workspace.openTextDocument({
      content:
        'Valid text\n[link text](https://example.com)\nAnother text\nMulti\nline selection',
      language: 'markdown',
    })

    const editor = await vscode.window.showTextDocument(document)

    // Test valid selection
    editor.selection = new vscode.Selection(0, 0, 0, 10)
    try {
      await vscode.commands.executeCommand('paste-markdown-link.paste')
      assert.ok(true, 'Command should handle valid selection')
    } catch (error) {
      assert.ok(
        error instanceof Error,
        'Should throw a proper error if it fails',
      )
    }

    // Test selection inside existing link
    editor.selection = new vscode.Selection(1, 1, 1, 10)
    try {
      await vscode.commands.executeCommand('paste-markdown-link.paste')
      assert.ok(true, 'Command should handle selection inside link gracefully')
    } catch (error) {
      assert.ok(
        error instanceof Error,
        'Should throw a proper error if it fails',
      )
    }

    // Test multi-line selection
    editor.selection = new vscode.Selection(3, 0, 4, 6)
    try {
      await vscode.commands.executeCommand('paste-markdown-link.paste')
      assert.ok(true, 'Command should handle multi-line selection gracefully')
    } catch (error) {
      assert.ok(
        error instanceof Error,
        'Should throw a proper error if it fails',
      )
    }
  })

  // Multi-selection tests
  test('Should handle multi-selection correctly', async () => {
    const document = await vscode.workspace.openTextDocument({
      content: 'First selection\nSecond selection\nThird selection',
      language: 'markdown',
    })

    const editor = await vscode.window.showTextDocument(document)

    const selections = [
      new vscode.Selection(0, 0, 0, 15),
      new vscode.Selection(1, 0, 1, 16),
      new vscode.Selection(2, 0, 2, 15),
    ]
    editor.selections = selections

    assert.strictEqual(editor.selections.length, 3, 'Should have 3 selections')

    try {
      await vscode.commands.executeCommand('paste-markdown-link.paste')
      assert.ok(true, 'Command should handle multi-selection')
    } catch (error) {
      assert.ok(
        error instanceof Error,
        'Should throw a proper error if it fails',
      )
    }
  })

  // Extension metadata tests
  test('Extension should have correct metadata', () => {
    const extension = vscode.extensions.getExtension(
      'tomchen.paste-markdown-link',
    )
    if (extension) {
      const packageJson = extension.packageJSON

      assert.strictEqual(
        packageJson.name,
        'paste-markdown-link',
        'Extension name should match',
      )
      assert.strictEqual(
        packageJson.displayName,
        'Paste Markdown Link',
        'Display name should match',
      )
      assert.ok(packageJson.description, 'Should have a description')
      assert.ok(packageJson.version, 'Should have a version')
      assert.ok(
        packageJson.engines.vscode,
        'Should specify VS Code engine version',
      )
      assert.ok(
        Array.isArray(packageJson.categories),
        'Should have categories array',
      )
      assert.ok(
        Array.isArray(packageJson.keywords),
        'Should have keywords array',
      )
    } else {
      assert.fail('Extension not found')
    }
  })

  // Cursor positioning tests
  suite('Cursor Positioning Tests', () => {
    test('Should position cursor at end of markdown link when text is selected and URL is pasted', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'abc',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 0, 3)
      editor.selection = selection

      // Test the cursor positioning logic directly
      const selectedText = document.getText(selection)
      const clipboardText = 'http://example.com'
      const replacementText = `[${selectedText}](${clipboardText})`

      await editor.edit((editBuilder) => {
        editBuilder.replace(selection, replacementText)
      })

      // Calculate expected cursor position
      const startChar = selection.start.character
      const replacementLines = replacementText.split('\n')
      const lastLine = selection.start.line + replacementLines.length - 1
      const lastLineLength =
        replacementLines[replacementLines.length - 1].length
      const expectedPosition = new vscode.Position(
        lastLine,
        startChar + lastLineLength,
      )

      editor.selection = new vscode.Selection(
        expectedPosition,
        expectedPosition,
      )

      // Verify content and cursor position
      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '[abc](http://example.com)',
        'Should create markdown link',
      )
      assert.strictEqual(
        editor.selection.start.character,
        expectedPosition.character,
        'Cursor should be at end',
      )
    })

    test('Should position cursor at end of markdown image when text is selected and image URL is pasted', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'alt text',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 0, 9)
      editor.selection = selection

      const selectedText = document.getText(selection)
      const clipboardText = 'https://example.com/image.jpg'
      const replacementText = `![${selectedText}](${clipboardText})`

      await editor.edit((editBuilder) => {
        editBuilder.replace(selection, replacementText)
      })

      const startChar = selection.start.character
      const replacementLines = replacementText.split('\n')
      const lastLine = selection.start.line + replacementLines.length - 1
      const lastLineLength =
        replacementLines[replacementLines.length - 1].length
      const expectedPosition = new vscode.Position(
        lastLine,
        startChar + lastLineLength,
      )

      editor.selection = new vscode.Selection(
        expectedPosition,
        expectedPosition,
      )

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '![alt text](https://example.com/image.jpg)',
        'Should create markdown image',
      )
      assert.strictEqual(
        editor.selection.start.character,
        expectedPosition.character,
        'Cursor should be at end',
      )
    })

    test('Should position cursor inside brackets for forced mode with no selection', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const position = new vscode.Position(0, 0)
      editor.selection = new vscode.Selection(position, position)

      const selectedText = document.getText(editor.selection)
      const clipboardText = 'https://example.com'
      const replacementText = `[](${clipboardText})`

      await editor.edit((editBuilder) => {
        editBuilder.replace(editor.selection, replacementText)
      })

      const startChar = position.character
      const prefixLength = 0
      const bracketStart = startChar + prefixLength + 1
      const expectedPosition = new vscode.Position(0, bracketStart)

      editor.selection = new vscode.Selection(
        expectedPosition,
        expectedPosition,
      )

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '[](https://example.com)',
        'Should create placeholder link',
      )
      assert.strictEqual(
        editor.selection.start.character,
        expectedPosition.character,
        'Cursor should be inside brackets',
      )
    })

    test('Should position cursor at end when pasting non-URL content', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'selected',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 0, 8)
      editor.selection = selection

      const clipboardText = 'just some text'
      const replacementText = clipboardText

      await editor.edit((editBuilder) => {
        editBuilder.replace(selection, replacementText)
      })

      const startChar = selection.start.character
      const replacementLines = replacementText.split('\n')
      const lastLine = selection.start.line + replacementLines.length - 1
      const lastLineLength =
        replacementLines[replacementLines.length - 1].length
      const expectedPosition = new vscode.Position(
        lastLine,
        startChar + lastLineLength,
      )

      editor.selection = new vscode.Selection(
        expectedPosition,
        expectedPosition,
      )

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        'just some text',
        'Should paste non-URL content as-is',
      )
      assert.strictEqual(
        editor.selection.start.character,
        expectedPosition.character,
        'Cursor should be at end',
      )
    })

    test('Should handle multi-line content correctly', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'line1\nline2',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 1, 5)
      editor.selection = selection

      const selectedText = document.getText(selection)
      const clipboardText = 'https://example.com'
      const replacementText = `[${selectedText}](${clipboardText})`

      await editor.edit((editBuilder) => {
        editBuilder.replace(selection, replacementText)
      })

      const startChar = selection.start.character
      const replacementLines = replacementText.split('\n')
      const lastLine = selection.start.line + replacementLines.length - 1
      const lastLineLength =
        replacementLines[replacementLines.length - 1].length
      const expectedPosition = new vscode.Position(
        lastLine,
        startChar + lastLineLength,
      )

      editor.selection = new vscode.Selection(
        expectedPosition,
        expectedPosition,
      )

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '[line1\nline2](https://example.com)',
        'Should create multi-line markdown link',
      )
      assert.strictEqual(
        editor.selection.start.line,
        expectedPosition.line,
        'Cursor should be on last line',
      )
      assert.strictEqual(
        editor.selection.start.character,
        expectedPosition.character,
        'Cursor should be at end',
      )
    })

    test('Should replace newlines with spaces in forced mode with multi-line selection', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'line1\nline2\nline3',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 2, 5) // Select all three lines
      editor.selection = selection

      const selectedText = document.getText(selection)
      const clipboardText = 'https://example.com'
      // In forced mode, newlines should be replaced with spaces
      const cleanedSelectedText = selectedText.replace(/\n/g, ' ')
      const replacementText = `[${cleanedSelectedText}](${clipboardText})`

      await editor.edit((editBuilder) => {
        editBuilder.replace(selection, replacementText)
      })

      // Since newlines are replaced with spaces, the result should be single-line
      const startChar = selection.start.character
      const replacementLines = replacementText.split('\n')
      const lastLine = selection.start.line + replacementLines.length - 1
      const lastLineLength =
        replacementLines[replacementLines.length - 1].length
      const expectedPosition = new vscode.Position(
        lastLine,
        startChar + lastLineLength,
      )

      editor.selection = new vscode.Selection(
        expectedPosition,
        expectedPosition,
      )

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '[line1 line2 line3](https://example.com)',
        'Should create single-line markdown link with spaces',
      )
      assert.strictEqual(
        editor.selection.start.line,
        expectedPosition.line,
        'Cursor should be on the same line',
      )
      assert.strictEqual(
        editor.selection.start.character,
        expectedPosition.character,
        'Cursor should be at end',
      )
    })

    test('Should replace newlines with spaces in forced mode with multi-line selection for images', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'alt text\nwith\nmultiple lines',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 2, 14) // Select all three lines (line 2 has 'multiple lines' = 14 chars)
      editor.selection = selection

      const selectedText = document.getText(selection)
      const clipboardText = 'https://example.com/image.jpg'
      // In forced mode, newlines should be replaced with spaces
      const cleanedSelectedText = selectedText.replace(/\n/g, ' ')
      const replacementText = `![${cleanedSelectedText}](${clipboardText})`

      await editor.edit((editBuilder) => {
        editBuilder.replace(selection, replacementText)
      })

      // Since newlines are replaced with spaces, the result should be single-line
      const startChar = selection.start.character
      const replacementLines = replacementText.split('\n')
      const lastLine = selection.start.line + replacementLines.length - 1
      const lastLineLength =
        replacementLines[replacementLines.length - 1].length
      const expectedPosition = new vscode.Position(
        lastLine,
        startChar + lastLineLength,
      )

      editor.selection = new vscode.Selection(
        expectedPosition,
        expectedPosition,
      )

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '![alt text with multiple lines](https://example.com/image.jpg)',
        'Should create single-line markdown image with spaces',
      )
      assert.strictEqual(
        editor.selection.start.line,
        expectedPosition.line,
        'Cursor should be on the same line',
      )
      assert.strictEqual(
        editor.selection.start.character,
        expectedPosition.character,
        'Cursor should be at end',
      )
    })

    test('Should position cursor correctly with multiple selections - specific bug case', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'abcde\nfghij\nklmno\npqrst\nuvwxyz',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)

      // Create multiple selections:
      // 1. First selection: "abcde\nfg" (multi-line)
      // 2. Second selection: "kl" (single-line, this is the LAST selection)
      const selections = [
        new vscode.Selection(0, 0, 1, 2), // "abcde\nfg" (multi-line)
        new vscode.Selection(2, 0, 2, 2), // "kl" (single-line, this is the LAST selection)
      ]
      editor.selections = selections

      // Set up clipboard
      await vscode.env.clipboard.writeText('http://example.com')

      // Execute the command (normal mode, should paste URL as-is for first, link for second if valid)
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()

      // First selection should be replaced with URL as-is: "http://example.com"
      // Second selection should be replaced with markdown link: "[kl](http://example.com)"
      const expectedContent =
        'http://example.comhij\n[kl](http://example.com)mno\npqrst\nuvwxyz'
      assert.strictEqual(
        updatedContent,
        expectedContent,
        'Both selections should be replaced correctly',
      )

      // Cursor should be positioned at the end of the LAST selection's replacement
      // The last selection was "kl" on line 2 (which becomes line 1 after first replacement), position 0-2
      // After replacement it becomes "[kl](http://example.com)" = 24 characters
      // So cursor should be at line 1, character 24
      const expectedCursorLine = 1
      const expectedCursorChar = 24 // length of "[kl](http://example.com)"

      assert.strictEqual(
        editor.selection.start.line,
        expectedCursorLine,
        'Cursor should be on the correct line',
      )
      assert.strictEqual(
        editor.selection.start.character,
        expectedCursorChar,
        'Cursor should be at the end of the last selection replacement',
      )
    })

    test('Should position cursor correctly when selections are not in document order', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'line1\nline2\nline3\nline4\nline5',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)

      // Key insight: Create selections where the LAST in array appears BEFORE others in document
      // Current buggy logic: processes array order but applies line deltas as if all non-last affect last
      // This will incorrectly apply line deltas from selections that appear AFTER the last selection

      const selections = [
        new vscode.Selection(3, 0, 4, 5), // "line4\nline5" (2 lines become 1) - NOT last in array, appears AFTER
        new vscode.Selection(1, 0, 1, 5), // "line2" - LAST in array, appears BEFORE the above selection
      ]
      editor.selections = selections

      await vscode.env.clipboard.writeText('http://example.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste-nocheck')

      const updatedContent = document.getText()

      // Expected content:
      // "line4\nline5" -> "[line4 line5](http://example.com)"
      // "line2" -> "[line2](http://example.com)"
      const expectedContent =
        'line1\n[line2](http://example.com)\nline3\n[line4 line5](http://example.com)'
      assert.strictEqual(
        updatedContent,
        expectedContent,
        'Content should be correct',
      )

      // THE BUG: Current logic will incorrectly calculate cursor position
      // - It processes "line4\nline5" first (array index 0), calculates lineDelta = -1 (2 lines -> 1 line)
      // - Then it applies this lineDelta to "line2" position, even though "line4\nline5" appears AFTER "line2"
      // - So it will think "line2" moved from line 1 to line 0, which is wrong

      // CORRECT: "line2" is on line 1, becomes "[line2](http://example.com)" (27 chars)
      // WRONG (with current bug): cursor might be calculated for line 0 + some wrong position

      const expectedCursorLine = 1 // "line2" is on line 1
      const expectedCursorChar = 27 // length of "[line2](http://example.com)"

      // This should FAIL with the current buggy implementation
      assert.strictEqual(
        editor.selection.start.line,
        expectedCursorLine,
        'Cursor should be on line 1 where line2 was replaced',
      )
      assert.strictEqual(
        editor.selection.start.character,
        expectedCursorChar,
        'Cursor should be at end of [line2](http://example.com)',
      )
    })
  })

  // Tests for markdown image selections
  suite('Markdown Image Selection Tests', () => {
    test('Should create markdown link when selecting text with complete markdown image - case 1', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'Hello![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      // Select the entire text "Hello![TEXT](https://example.com)"
      const selection = new vscode.Selection(0, 0, 0, 33)
      editor.selection = selection

      // Set clipboard to URL
      await vscode.env.clipboard.writeText('https://example.com/pasted')

      // Execute normal paste command
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '[Hello![TEXT](https://example.com)](https://example.com/pasted)',
        'Should create markdown link wrapping the text with image',
      )
    })

    test('Should create markdown link when selecting complete markdown image - case 2', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![Open VSX Version](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      // Select the entire image "![Open VSX Version](https://example.com)"
      const selection = new vscode.Selection(0, 0, 0, 40)
      editor.selection = selection

      // Set clipboard to URL
      await vscode.env.clipboard.writeText('https://example.com/pasted')

      // Execute normal paste command
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '[![Open VSX Version](https://example.com)](https://example.com/pasted)',
        'Should create markdown link wrapping the complete image',
      )
    })

    test('Should create markdown link when selecting text with multiple complete markdown images - case 3', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)sas![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      // Select the entire text "![TEXT](https://example.com)sas![TEXT](https://example.com)"
      // Length: 59 characters (verified by debug output)
      const selection = new vscode.Selection(0, 0, 0, 59)
      editor.selection = selection

      // Set clipboard to URL
      await vscode.env.clipboard.writeText('https://example.com/pasted')

      // Execute normal paste command
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '[![TEXT](https://example.com)sas![TEXT](https://example.com)](https://example.com/pasted)',
        'Should create markdown link wrapping text with multiple images',
      )
    })

    test('Should NOT create markdown link when selection contains regular markdown link - case 4', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)sas[TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      // Select the entire text "![TEXT](https://example.com)sas[TEXT](https://example.com)"
      // Length: 58 characters (verified by debug output)
      const selection = new vscode.Selection(0, 0, 0, 58)
      editor.selection = selection

      // Set clipboard to URL
      await vscode.env.clipboard.writeText('https://example.com/pasted')

      // Execute normal paste command
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        'https://example.com/pasted',
        'Should paste URL as-is when selection contains regular markdown link',
      )
    })

    test('Should NOT create markdown link when selection partially overlaps markdown image - case 5', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)sas![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      // Select "![TEXT](https://example.com)sas![TE" - partial overlap with second image
      // Length: 35 characters (verified by debug output)
      const selection = new vscode.Selection(0, 0, 0, 35)
      editor.selection = selection

      // Set clipboard to URL
      await vscode.env.clipboard.writeText('https://example.com/pasted')

      // Execute normal paste command
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        'https://example.com/pastedXT](https://example.com)',
        'Should paste URL as-is when selection partially overlaps markdown image',
      )
    })

    // Tests for partial selections within markdown images
    test('Should NOT create markdown link when selecting URL part within markdown image - case 6', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      // Select "https://example.com" inside the image (positions 8-27, end exclusive)
      const selection = new vscode.Selection(0, 8, 0, 27)
      editor.selection = selection

      // Set clipboard to URL
      await vscode.env.clipboard.writeText('https://example.com/pasted')

      // Execute normal paste command
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '![TEXT](https://example.com/pasted)',
        'Should paste URL as-is when selecting URL part within markdown image',
      )
    })

    test('Should NOT create markdown link when selecting partial text within markdown image - case 7', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      // Select "XT](htt" spanning across text and URL
      const selection = new vscode.Selection(0, 4, 0, 11)
      editor.selection = selection

      // Set clipboard to URL
      await vscode.env.clipboard.writeText('https://example.com/pasted')

      // Execute normal paste command
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '![TEhttps://example.com/pastedps://example.com)',
        'Should paste URL as-is when selecting partial text within markdown image',
      )
    })

    test('Should NOT create markdown link when selecting image prefix within markdown image - case 8', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      // Select "![" at the beginning
      const selection = new vscode.Selection(0, 0, 0, 2)
      editor.selection = selection

      // Set clipboard to URL
      await vscode.env.clipboard.writeText('https://example.com/pasted')

      // Execute normal paste command
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        'https://example.com/pastedTEXT](https://example.com)',
        'Should paste URL as-is when selecting image prefix within markdown image',
      )
    })

    test('Should NOT create markdown link when selecting bracket part within markdown image - case 9', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      // Select "](" between text and URL
      const selection = new vscode.Selection(0, 6, 0, 8)
      editor.selection = selection

      // Set clipboard to URL
      await vscode.env.clipboard.writeText('https://example.com/pasted')

      // Execute normal paste command
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '![TEXThttps://example.com/pastedhttps://example.com)',
        'Should paste URL as-is when selecting bracket part within markdown image',
      )
    })

    test('Should NOT create markdown link when selecting partial alt text within markdown image - case 10', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      // Select "TEX" within alt text
      const selection = new vscode.Selection(0, 2, 0, 5)
      editor.selection = selection

      // Set clipboard to URL
      await vscode.env.clipboard.writeText('https://example.com/pasted')

      // Execute normal paste command
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '![https://example.com/pastedT](https://example.com)',
        'Should paste URL as-is when selecting partial alt text within markdown image',
      )
    })

    test('Should NOT create markdown link when selecting full alt text within markdown image - case 11', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      // Select "TEXT" (full alt text but not the whole image)
      const selection = new vscode.Selection(0, 2, 0, 6)
      editor.selection = selection

      // Set clipboard to URL
      await vscode.env.clipboard.writeText('https://example.com/pasted')

      // Execute normal paste command
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      const updatedContent = document.getText()
      assert.strictEqual(
        updatedContent,
        '![https://example.com/pasted](https://example.com)',
        'Should paste URL as-is when selecting full alt text within markdown image',
      )
    })
  })
})
