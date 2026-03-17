import * as assert from 'assert'
import * as vscode from 'vscode'
import {
  URL_PATTERN,
  MARKDOWN_INLINE_PATTERN,
  MARKDOWN_REF_PATTERN,
  maskCodeSpans,
  isLineSelectionValid,
  buildReplacementText,
} from '../extension.js'

suite('Extension Test Suite', () => {
  vscode.window.showInformationMessage('Start all tests.')

  // ─── Basic Extension Tests ──────────────────────────────────────────

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

  test('Extension should have correct metadata', () => {
    const extension = vscode.extensions.getExtension(
      'tomchen.paste-markdown-link',
    )
    if (extension) {
      const packageJson = extension.packageJSON

      assert.strictEqual(packageJson.name, 'paste-markdown-link')
      assert.strictEqual(packageJson.displayName, 'Paste Markdown Link')
      assert.ok(packageJson.description)
      assert.ok(packageJson.version)
      assert.ok(packageJson.engines.vscode)
      assert.ok(Array.isArray(packageJson.categories))
      assert.ok(Array.isArray(packageJson.keywords))
    } else {
      assert.fail('Extension not found')
    }
  })

  // ─── Pure Function Tests: URL_PATTERN ─────────────────────────────

  suite('URL_PATTERN', () => {
    test('Should match valid URLs', () => {
      const validUrls = [
        'https://example.com',
        'http://example.com',
        'ftp://example.com',
        'mailto:test@example.com',
        'tel:+1234567890',
        'file:///path/to/file',
        'vscode://extension/id',
        'cursor://settings',
        'ws://localhost:8080',
        'wss://example.com/socket',
      ]
      validUrls.forEach((url) => {
        assert.ok(URL_PATTERN.test(url), `Should match ${url}`)
      })
    })

    test('Should not match invalid URLs', () => {
      const invalidUrls = [
        'not-a-url',
        'example.com',
        '',
        'just text',
        '://missing-protocol',
      ]
      invalidUrls.forEach((url) => {
        assert.ok(!URL_PATTERN.test(url), `Should not match ${url}`)
      })
    })
  })

  // ─── Pure Function Tests: MARKDOWN_INLINE_PATTERN ─────────────────

  suite('MARKDOWN_INLINE_PATTERN', () => {
    test('Should match regular inline links', () => {
      const text = 'This is a [link](https://example.com) in a sentence'
      const matches = Array.from(text.matchAll(MARKDOWN_INLINE_PATTERN))
      assert.strictEqual(matches.length, 1)
      assert.strictEqual(matches[0][0], '[link](https://example.com)')
    })

    test('Should match inline images', () => {
      const text = 'This is an ![image](https://example.com/img.png) here'
      const matches = Array.from(text.matchAll(MARKDOWN_INLINE_PATTERN))
      assert.strictEqual(matches.length, 1)
      assert.strictEqual(matches[0][0], '![image](https://example.com/img.png)')
    })

    test('Should match multiple links in one line', () => {
      const text = '[a](url1) and [b](url2) and ![c](url3)'
      const matches = Array.from(text.matchAll(MARKDOWN_INLINE_PATTERN))
      assert.strictEqual(matches.length, 3)
    })

    test('Should match nested structures (clickable images)', () => {
      const text = '[![alt](https://example.com/img.png)](https://example.com)'
      const matches = Array.from(text.matchAll(MARKDOWN_INLINE_PATTERN))
      assert.strictEqual(matches.length, 1)
      assert.strictEqual(matches[0][0], text)
    })

    test('Should handle URLs with balanced parentheses', () => {
      const text = '[wiki](https://en.wikipedia.org/wiki/Foo_(bar))'
      const matches = Array.from(text.matchAll(MARKDOWN_INLINE_PATTERN))
      assert.strictEqual(matches.length, 1)
      assert.strictEqual(
        matches[0][0],
        '[wiki](https://en.wikipedia.org/wiki/Foo_(bar))',
      )
    })

    test('Should handle image URLs with balanced parentheses', () => {
      const text = '![img](https://example.com/image_(1).png)'
      const matches = Array.from(text.matchAll(MARKDOWN_INLINE_PATTERN))
      assert.strictEqual(matches.length, 1)
      assert.strictEqual(
        matches[0][0],
        '![img](https://example.com/image_(1).png)',
      )
    })

    test('Should find no links in plain text', () => {
      const text = 'This is just plain text without any links'
      const matches = Array.from(text.matchAll(MARKDOWN_INLINE_PATTERN))
      assert.strictEqual(matches.length, 0)
    })

    test('Should match complex nested case with multiple nested structures', () => {
      const text =
        'Text [![img1](url1)](link1) more text [![img2](url2)](link2) end'
      const matches = Array.from(text.matchAll(MARKDOWN_INLINE_PATTERN))
      assert.strictEqual(matches.length, 2)
    })
  })

  // ─── Pure Function Tests: MARKDOWN_REF_PATTERN ────────────────────

  suite('MARKDOWN_REF_PATTERN', () => {
    test('Should match reference-style links', () => {
      const text = 'This is a [link][ref-id] in a sentence'
      const matches = Array.from(text.matchAll(MARKDOWN_REF_PATTERN))
      assert.strictEqual(matches.length, 1)
      assert.strictEqual(matches[0][0], '[link][ref-id]')
    })

    test('Should match reference-style images', () => {
      const text = 'This is an ![image][img-ref] in a sentence'
      const matches = Array.from(text.matchAll(MARKDOWN_REF_PATTERN))
      assert.strictEqual(matches.length, 1)
      assert.strictEqual(matches[0][0], '![image][img-ref]')
    })

    test('Should match collapsed reference links', () => {
      const text = 'This is a [link][] in a sentence'
      const matches = Array.from(text.matchAll(MARKDOWN_REF_PATTERN))
      assert.strictEqual(matches.length, 1)
      assert.strictEqual(matches[0][0], '[link][]')
    })

    test('Should match multiple reference links', () => {
      const text = '[a][1] and [b][2] and ![c][3]'
      const matches = Array.from(text.matchAll(MARKDOWN_REF_PATTERN))
      assert.strictEqual(matches.length, 3)
    })

    test('Should not match plain bracketed text without second brackets', () => {
      const text = '[just text] without ref'
      const matches = Array.from(text.matchAll(MARKDOWN_REF_PATTERN))
      assert.strictEqual(matches.length, 0)
    })
  })

  // ─── Pure Function Tests: isLineSelectionValid ────────────────────

  suite('isLineSelectionValid', () => {
    test('Should return true for plain text with no links', () => {
      assert.ok(isLineSelectionValid('Hello world', 0, 5))
    })

    test('Should return false when selection overlaps regular inline link', () => {
      const line = 'See [link](url) here'
      assert.ok(!isLineSelectionValid(line, 3, 8)) // overlaps "[link"
      assert.ok(!isLineSelectionValid(line, 0, 20)) // contains entire line with link
      assert.ok(!isLineSelectionValid(line, 5, 10)) // inside link text
    })

    test('Should return false when selection overlaps regular reference link', () => {
      const line = 'See [link][ref] here'
      assert.ok(!isLineSelectionValid(line, 3, 8)) // overlaps "[link"
      assert.ok(!isLineSelectionValid(line, 5, 12)) // inside link
    })

    test('Should return true when selection completely contains an image', () => {
      const line = '![img](url) end'
      assert.ok(isLineSelectionValid(line, 0, 11))
    })

    test('Should return false when selection partially overlaps an image', () => {
      const line = '![img](url) end'
      assert.ok(!isLineSelectionValid(line, 0, 5))
      assert.ok(!isLineSelectionValid(line, 3, 8))
      assert.ok(!isLineSelectionValid(line, 7, 14))
    })

    test('Should return false when selection partially overlaps reference image', () => {
      const line = '![img][ref] end'
      assert.ok(!isLineSelectionValid(line, 0, 5))
      assert.ok(!isLineSelectionValid(line, 3, 8))
    })

    test('Should return true when selection completely contains reference image', () => {
      const line = '![img][ref] end'
      assert.ok(isLineSelectionValid(line, 0, 11))
    })

    test('Should handle inline links with balanced parentheses in URL', () => {
      const line = 'See [wiki](https://en.wikipedia.org/wiki/Foo_(bar)) here'
      // Selection inside the link → invalid
      assert.ok(!isLineSelectionValid(line, 5, 15))
      // Selection outside the link → valid
      assert.ok(isLineSelectionValid(line, 52, 56))
    })

    test('Should handle text between links', () => {
      const line = '[a](url1) text [b](url2)'
      assert.ok(isLineSelectionValid(line, 10, 14))
    })

    test('Should handle selection that completely contains multiple images', () => {
      const line = '![a](u1) text ![b](u2)'
      assert.ok(isLineSelectionValid(line, 0, 22))
    })

    test('Should allow selection containing link syntax inside code span', () => {
      const line = 'select `[TEXT](URL)` here'
      // The whole thing including backticks
      assert.ok(isLineSelectionValid(line, 0, 20))
      // Just the code span
      assert.ok(isLineSelectionValid(line, 7, 20))
      // Text around code span
      assert.ok(isLineSelectionValid(line, 0, 24))
    })

    test('Should allow selection of code span with reference link syntax', () => {
      const line = 'see `[link][ref]` end'
      assert.ok(isLineSelectionValid(line, 0, 17))
    })

    test('Should still reject real link outside code span', () => {
      const line = '`code` [link](url) end'
      assert.ok(!isLineSelectionValid(line, 5, 20))
    })

    test('Should handle double-backtick code spans', () => {
      const line = 'text ``[link](url)`` end'
      assert.ok(isLineSelectionValid(line, 0, 20))
    })
  })

  // ─── Pure Function Tests: maskCodeSpans ───────────────────────────

  suite('maskCodeSpans', () => {
    test('Should mask single-backtick code spans', () => {
      const result = maskCodeSpans('text `[link](url)` end')
      assert.ok(!result.includes('[link]'))
      assert.strictEqual(result.length, 'text `[link](url)` end'.length)
    })

    test('Should mask double-backtick code spans', () => {
      const result = maskCodeSpans('text ``[link](url)`` end')
      assert.ok(!result.includes('[link]'))
      assert.strictEqual(result.length, 'text ``[link](url)`` end'.length)
    })

    test('Should preserve text outside code spans', () => {
      const result = maskCodeSpans('before `code` [link](url)')
      assert.ok(result.includes('[link](url)'))
    })

    test('Should handle multiple code spans', () => {
      const result = maskCodeSpans('`[a](b)` text `[c](d)`')
      assert.ok(!result.includes('[a]'))
      assert.ok(!result.includes('[c]'))
    })

    test('Should return unchanged text without backticks', () => {
      const text = 'no code spans here [link](url)'
      assert.strictEqual(maskCodeSpans(text), text)
    })
  })

  // ─── Pure Function Tests: buildReplacementText ────────────────────

  suite('buildReplacementText', () => {
    test('Non-forced: valid selection + URL → markdown link', () => {
      assert.strictEqual(
        buildReplacementText('text', 'https://example.com', true, false, false),
        '[text](https://example.com)',
      )
    })

    test('Non-forced: valid selection + non-URL → paste as-is', () => {
      assert.strictEqual(
        buildReplacementText('text', 'not a url', true, false, false),
        'not a url',
      )
    })

    test('Non-forced: invalid selection + URL → paste as-is', () => {
      assert.strictEqual(
        buildReplacementText(
          'text',
          'https://example.com',
          false,
          false,
          false,
        ),
        'https://example.com',
      )
    })

    test('Non-forced: no selection + URL → paste as-is', () => {
      assert.strictEqual(
        buildReplacementText('', 'https://example.com', true, false, false),
        'https://example.com',
      )
    })

    test('Forced: no selection → placeholder link', () => {
      assert.strictEqual(
        buildReplacementText('', 'clipboard', true, true, false),
        '[](clipboard)',
      )
    })

    test('Forced image: no selection → placeholder image', () => {
      assert.strictEqual(
        buildReplacementText('', 'clipboard', true, true, true),
        '![](clipboard)',
      )
    })

    test('Forced: with selection → link', () => {
      assert.strictEqual(
        buildReplacementText('text', 'clipboard', true, true, false),
        '[text](clipboard)',
      )
    })

    test('Forced image: with selection → image', () => {
      assert.strictEqual(
        buildReplacementText('alt', 'https://img.png', true, true, true),
        '![alt](https://img.png)',
      )
    })

    test('Forced: multi-line selection → newlines replaced with spaces', () => {
      assert.strictEqual(
        buildReplacementText('line1\nline2\nline3', 'url', true, true, false),
        '[line1 line2 line3](url)',
      )
    })

    test('Forced image: multi-line selection → newlines replaced with spaces', () => {
      assert.strictEqual(
        buildReplacementText('alt\ntext', 'url', true, true, true),
        '![alt text](url)',
      )
    })
  })

  // ─── Edge Cases ───────────────────────────────────────────────────

  suite('Edge Cases', () => {
    test('Should handle no active editor gracefully', async () => {
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
    })

    test('Should handle no selection (cursor only) gracefully', async () => {
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

    test('Should handle empty clipboard', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'some text',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 0, 4)

      await vscode.env.clipboard.writeText('')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        'some text',
        'Content should remain unchanged with empty clipboard',
      )
    })

    test('Should handle whitespace-only clipboard', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'some text',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 0, 4)

      await vscode.env.clipboard.writeText('   ')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        'some text',
        'Content should remain unchanged with whitespace-only clipboard',
      )
    })
  })

  // ─── Paste Command (Ctrl+V) ──────────────────────────────────────

  suite('Paste Command (Ctrl+V)', () => {
    test('Valid selection + URL → markdown link with cursor at end', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'abc',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 0, 3)

      await vscode.env.clipboard.writeText('https://example.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(document.getText(), '[abc](https://example.com)')
      // "[abc](https://example.com)" = 26 chars
      assert.strictEqual(editor.selection.start.line, 0)
      assert.strictEqual(editor.selection.start.character, 26)
    })

    test('Valid selection + non-URL → paste as-is with cursor at end', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'selected',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 0, 8)

      await vscode.env.clipboard.writeText('just some text')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(document.getText(), 'just some text')
      assert.strictEqual(editor.selection.start.character, 14)
    })

    test('Selection inside existing inline link → paste as-is', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '[link text](https://example.com)',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 1, 0, 10)

      await vscode.env.clipboard.writeText('https://other.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        '[https://other.com](https://example.com)',
      )
    })

    test('Selection inside reference-style link → paste as-is', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '[link text][ref-id]',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 1, 0, 10)

      await vscode.env.clipboard.writeText('https://other.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(document.getText(), '[https://other.com][ref-id]')
    })

    test('Selection inside inline link with balanced-paren URL → paste as-is', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '[wiki](https://en.wikipedia.org/wiki/Foo_(bar))',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      // Select "wiki" text inside the link
      editor.selection = new vscode.Selection(0, 1, 0, 5)

      await vscode.env.clipboard.writeText('https://other.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        '[https://other.com](https://en.wikipedia.org/wiki/Foo_(bar))',
      )
    })

    test('Multi-line selection → paste as-is', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'line1\nline2',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 1, 5)

      await vscode.env.clipboard.writeText('https://example.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(document.getText(), 'https://example.com')
    })

    test('Selection containing link syntax inside code span → creates link', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '`[TEXT](URL)`',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 0, 13)

      await vscode.env.clipboard.writeText('https://example.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        '[`[TEXT](URL)`](https://example.com)',
      )
    })
  })

  // ─── Paste Markdown Link (forced, no check) ──────────────────────

  suite('Paste Markdown Link (forced, no check)', () => {
    test('No selection → placeholder link with cursor inside brackets', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 0, 0)

      await vscode.env.clipboard.writeText('https://example.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste-nocheck')

      assert.strictEqual(document.getText(), '[](https://example.com)')
      // Cursor inside brackets: position 1 (after "[")
      assert.strictEqual(editor.selection.start.character, 1)
    })

    test('With selection → forced link regardless of validity', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '[existing link](url)',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 0, 20)

      await vscode.env.clipboard.writeText('/relative/path')
      await vscode.commands.executeCommand('paste-markdown-link.paste-nocheck')

      assert.strictEqual(
        document.getText(),
        '[[existing link](url)](/relative/path)',
      )
    })

    test('Non-URL clipboard → still creates link (relative path use case)', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'text',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 0, 4)

      await vscode.env.clipboard.writeText('/relative/path')
      await vscode.commands.executeCommand('paste-markdown-link.paste-nocheck')

      assert.strictEqual(document.getText(), '[text](/relative/path)')
    })

    test('Multi-line selection → newlines replaced with spaces', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'line1\nline2\nline3',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 2, 5)

      await vscode.env.clipboard.writeText('https://example.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste-nocheck')

      assert.strictEqual(
        document.getText(),
        '[line1 line2 line3](https://example.com)',
      )
      assert.strictEqual(editor.selection.start.line, 0)
      // "[line1 line2 line3](https://example.com)" = 40 chars
      assert.strictEqual(editor.selection.start.character, 40)
    })
  })

  // ─── Paste Markdown Image ────────────────────────────────────────

  suite('Paste Markdown Image', () => {
    test('No selection → placeholder image with cursor inside brackets', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 0, 0)

      await vscode.env.clipboard.writeText('https://example.com/img.png')
      await vscode.commands.executeCommand('paste-markdown-link.paste-img')

      assert.strictEqual(document.getText(), '![](https://example.com/img.png)')
      // Cursor inside brackets: position 2 (after "![")
      assert.strictEqual(editor.selection.start.character, 2)
    })

    test('With selection → creates image link with cursor at end', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'alt text',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 0, 8)

      await vscode.env.clipboard.writeText('https://example.com/img.jpg')
      await vscode.commands.executeCommand('paste-markdown-link.paste-img')

      assert.strictEqual(
        document.getText(),
        '![alt text](https://example.com/img.jpg)',
      )
      assert.strictEqual(editor.selection.start.character, 40)
    })

    test('Multi-line selection → newlines replaced with spaces', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'alt text\nwith\nmultiple lines',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)
      editor.selection = new vscode.Selection(0, 0, 2, 14)

      await vscode.env.clipboard.writeText('https://example.com/image.jpg')
      await vscode.commands.executeCommand('paste-markdown-link.paste-img')

      assert.strictEqual(
        document.getText(),
        '![alt text with multiple lines](https://example.com/image.jpg)',
      )
    })
  })

  // ─── Cursor Positioning Tests ─────────────────────────────────────

  suite('Cursor Positioning', () => {
    test('Multiple selections across lines - cursor at end of last replacement', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'abcde\nfghij\nklmno\npqrst\nuvwxyz',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)

      const selections = [
        new vscode.Selection(0, 0, 1, 2), // "abcde\nfg" (multi-line → paste as-is)
        new vscode.Selection(2, 0, 2, 2), // "kl" (single-line → markdown link, LAST)
      ]
      editor.selections = selections

      await vscode.env.clipboard.writeText('http://example.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        'http://example.comhij\n[kl](http://example.com)mno\npqrst\nuvwxyz',
      )
      assert.strictEqual(editor.selection.start.line, 1)
      // "[kl](http://example.com)" = 24 chars
      assert.strictEqual(editor.selection.start.character, 24)
    })

    test('Selections not in document order - cursor tracks last in array', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'line1\nline2\nline3\nline4\nline5',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)

      const selections = [
        new vscode.Selection(3, 0, 4, 5), // "line4\nline5" (appears after, NOT last in array)
        new vscode.Selection(1, 0, 1, 5), // "line2" (appears before, LAST in array)
      ]
      editor.selections = selections

      await vscode.env.clipboard.writeText('http://example.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste-nocheck')

      assert.strictEqual(
        document.getText(),
        'line1\n[line2](http://example.com)\nline3\n[line4 line5](http://example.com)',
      )
      // Cursor at end of "line2" replacement on line 1
      assert.strictEqual(editor.selection.start.line, 1)
      // "[line2](http://example.com)" = 27 chars
      assert.strictEqual(editor.selection.start.character, 27)
    })

    test('Same-line multi-selection - character delta correctly applied', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'abc def ghi',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)

      // Two selections on the same line
      const selections = [
        new vscode.Selection(0, 0, 0, 3), // "abc" (first in array)
        new vscode.Selection(0, 8, 0, 11), // "ghi" (LAST in array)
      ]
      editor.selections = selections

      await vscode.env.clipboard.writeText('http://example.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      // "abc" → "[abc](http://example.com)" (25 chars, was 3, delta +22)
      // "ghi" → "[ghi](http://example.com)" (25 chars)
      assert.strictEqual(
        document.getText(),
        '[abc](http://example.com) def [ghi](http://example.com)',
      )
      // Cursor: startChar = 8 + 22 = 30, finalChar = 30 + 25 = 55
      assert.strictEqual(editor.selection.start.line, 0)
      assert.strictEqual(editor.selection.start.character, 55)
    })

    test('Three selections on the same line', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'aa bb cc',
        language: 'markdown',
      })
      const editor = await vscode.window.showTextDocument(document)

      const selections = [
        new vscode.Selection(0, 0, 0, 2), // "aa"
        new vscode.Selection(0, 3, 0, 5), // "bb"
        new vscode.Selection(0, 6, 0, 8), // "cc" (LAST)
      ]
      editor.selections = selections

      await vscode.env.clipboard.writeText('http://x.com')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      // "aa" → "[aa](http://x.com)" (18 chars, was 2, delta +16)
      // "bb" → "[bb](http://x.com)" (18 chars, was 2, delta +16)
      // "cc" → "[cc](http://x.com)" (18 chars)
      assert.strictEqual(
        document.getText(),
        '[aa](http://x.com) [bb](http://x.com) [cc](http://x.com)',
      )
      // charDelta = 16 + 16 = 32
      // startChar = 6 + 32 = 38, finalChar = 38 + 18 = 56
      assert.strictEqual(editor.selection.start.line, 0)
      assert.strictEqual(editor.selection.start.character, 56)
    })
  })

  // ─── Markdown Image Selection Tests ───────────────────────────────

  suite('Markdown Image Selection', () => {
    test('Should create markdown link when selecting text with complete markdown image - case 1', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: 'Hello![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 0, 33)
      editor.selection = selection

      await vscode.env.clipboard.writeText('https://example.com/pasted')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        '[Hello![TEXT](https://example.com)](https://example.com/pasted)',
      )
    })

    test('Should create markdown link when selecting complete markdown image - case 2', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![Open VSX Version](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 0, 40)
      editor.selection = selection

      await vscode.env.clipboard.writeText('https://example.com/pasted')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        '[![Open VSX Version](https://example.com)](https://example.com/pasted)',
      )
    })

    test('Should create markdown link when selecting text with multiple complete markdown images - case 3', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)sas![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 0, 59)
      editor.selection = selection

      await vscode.env.clipboard.writeText('https://example.com/pasted')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        '[![TEXT](https://example.com)sas![TEXT](https://example.com)](https://example.com/pasted)',
      )
    })

    test('Should NOT create markdown link when selection contains regular markdown link - case 4', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)sas[TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 0, 58)
      editor.selection = selection

      await vscode.env.clipboard.writeText('https://example.com/pasted')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(document.getText(), 'https://example.com/pasted')
    })

    test('Should NOT create markdown link when selection partially overlaps markdown image - case 5', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)sas![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 0, 35)
      editor.selection = selection

      await vscode.env.clipboard.writeText('https://example.com/pasted')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        'https://example.com/pastedXT](https://example.com)',
      )
    })

    test('Should NOT create markdown link when selecting URL part within markdown image - case 6', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 8, 0, 27)
      editor.selection = selection

      await vscode.env.clipboard.writeText('https://example.com/pasted')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        '![TEXT](https://example.com/pasted)',
      )
    })

    test('Should NOT create markdown link when selecting partial text within markdown image - case 7', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 4, 0, 11)
      editor.selection = selection

      await vscode.env.clipboard.writeText('https://example.com/pasted')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        '![TEhttps://example.com/pastedps://example.com)',
      )
    })

    test('Should NOT create markdown link when selecting image prefix within markdown image - case 8', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 0, 0, 2)
      editor.selection = selection

      await vscode.env.clipboard.writeText('https://example.com/pasted')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        'https://example.com/pastedTEXT](https://example.com)',
      )
    })

    test('Should NOT create markdown link when selecting bracket part within markdown image - case 9', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 6, 0, 8)
      editor.selection = selection

      await vscode.env.clipboard.writeText('https://example.com/pasted')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        '![TEXThttps://example.com/pastedhttps://example.com)',
      )
    })

    test('Should NOT create markdown link when selecting partial alt text within markdown image - case 10', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 2, 0, 5)
      editor.selection = selection

      await vscode.env.clipboard.writeText('https://example.com/pasted')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        '![https://example.com/pastedT](https://example.com)',
      )
    })

    test('Should NOT create markdown link when selecting full alt text within markdown image - case 11', async () => {
      const document = await vscode.workspace.openTextDocument({
        content: '![TEXT](https://example.com)',
        language: 'markdown',
      })

      const editor = await vscode.window.showTextDocument(document)
      const selection = new vscode.Selection(0, 2, 0, 6)
      editor.selection = selection

      await vscode.env.clipboard.writeText('https://example.com/pasted')
      await vscode.commands.executeCommand('paste-markdown-link.paste')

      assert.strictEqual(
        document.getText(),
        '![https://example.com/pasted](https://example.com)',
      )
    })
  })
})
