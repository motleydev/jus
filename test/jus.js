/* globals describe, it */

const assert = require('assert')
const cheerio = require('cheerio')
const _ = require('lodash')
const jus = require('..')
var pages

describe('jus', function () {
  this.timeout(5000)

  it('is a function', function () {
    assert.equal(typeof jus, 'function')
  })

  it('takes a directory, then calls back with a `pages` object', function (done) {
    jus(__dirname + '/fixtures', function (err, _pages) {
      assert(!err)
      pages = _pages
      assert(pages)
      done()
    })
  })

  describe('pages', function () {

    it('is an object', function () {
      assert(pages)
      assert.equal(typeof pages, 'object')
    })

    it('includes .md files', function () {
      assert.equal(pages['/apples'].extension, '.md')
    })

    it('includes .markdown files', function () {
      assert.equal(pages['/other/papayas'].extension, '.markdown')
    })

    it('includes .html files', function () {
      assert.equal(pages['/oranges'].extension, '.html')
    })

    it('removes "index" suffix', function () {
      assert.equal(pages['/other'].relativePath, '/other/index.md')
    })

    it('find the top-level index page', function () {
      assert(pages['/'])
    })

    it('is case insensitive when finding files', function () {
      assert(pages['/other/UPPERCASE'])
    })

    describe('each page', function () {

      it('infers `parentName` from top-level directory')//, function () {
        // assert.equal(pages['/other/papayas'].parentName, 'other')
      // })

      it('has a relativePath', function () {
        assert.equal(pages['/other/papayas'].relativePath, '/other/papayas.markdown')
      })

      it('ingests HTML frontmatter', function () {
        assert.equal(pages['/apples'].title, 'Apples!')
        assert.deepEqual(pages['/apples'].keywords, ['fruit', 'doctors'])
      })

      it('converts markdown into HTML in `content.processed`', function () {
        const $ = cheerio.load(pages['/other/papayas'].content.processed)
        assert.equal($('a[href="https://digestion.com"]').text(), 'digestion')
      })

      it('preserves original content in `content.original`', function () {
        assert.equal(typeof pages['/other/papayas'].content.original, 'string')
      })

      describe('`src` attributes in the DOM', function() {
        var content

        before(function() {
          content = pages['/other'].content
        })

        it('converts relative', function(){
          assert(~content.original.indexOf('<img src="guava.png">'))
          assert(~content.processed.indexOf('<img src="/other/guava.png">'))

          assert(~content.original.indexOf('<script src="banana.js">'))
          assert(~content.processed.indexOf('<script src="/other/banana.js">'))
        })

        it('ignores absolute', function(){
          assert(~content.original.indexOf('<img src="https://guava.com/logo.png">'))
          assert(~content.processed.indexOf('<img src="https://guava.com/logo.png">'))
        })

        it('ignores protocol-relative', function(){
          assert(~content.original.indexOf('<img src="//guava-relative.com/logo.png">'))
          assert(~content.processed.indexOf('<img src="//guava-relative.com/logo.png">'))
        })

      })

      describe('`href` attributes in the DOM', function() {
        var content

        before(function() {
          content = pages['/other'].content
        })

        it('converts relative', function(){
          assert(~content.original.indexOf('<a href="papayas">papayas</a>'))
          assert(~content.processed.indexOf('<a href="/other/papayas">papayas</a>'))
        })

        it('converts relative with leading slash', function(){
          assert(~content.original.indexOf('<a href="/grapes">grapes</a>'))
          assert(~content.processed.indexOf('<a href="/other/grapes">grapes</a>'))
        })

        it('ignores absolute', function(){
          assert(~content.original.indexOf('<a href="http://mango.com">mango.com</a>'))
          assert(~content.processed.indexOf('<a href="http://mango.com">mango.com</a>'))
        })

        it('ignores protocol-relative', function(){
          assert(~content.original.indexOf('<a href="//coconut-cdn.com">coconut-cdn.com</a>'))
          assert(~content.processed.indexOf('<a href="//coconut-cdn.com">coconut-cdn.com</a>'))
        })

      })

      describe('title', function(){
        it('is derived from HTML frontmatter', function () {
          assert.equal(pages['/apples'].title, 'Apples!')
        })

        it('falls back to <title> tag, if present', function () {
          assert.equal(pages['/oranges'].title, 'We are Oranges')
        })

        it('falls back lastly to titlecased basename', function () {
          assert.equal(pages['/other/papayas'].title, 'Papayas')
        })
      })

      describe('isIndex', function(){
        it('is true if file is a directory index', function () {
          assert(pages['/other'].isIndex)
        })
        it('is false if file is NOT a directory index', function () {
          assert(!pages['/other/papayas'].isIndex)
        })
      })

      describe('images', function(){
        it("builds an images object with a key for each image in the page's directory", function () {
          assert.equal(pages['/thumbs/png'].images.thumb.href, '/thumbs/png/thumb.png')
        })

        it('can be an svg', function () {
          assert.equal(pages['/thumbs/svg'].images.thumbnail.href, '/thumbs/svg/thumbnail.svg')
        })

        it('can be a jpg', function () {
          assert.equal(pages['/thumbs/jpg'].images.thumb.href, '/thumbs/jpg/thumb.jpg')
        })

        it('can be a gif', function () {
          assert.equal(pages['/thumbs/gif'].images.thumb.href, '/thumbs/gif/thumb.gif')
        })

        it('includes width and height dimensions for each image', function() {
          const jpg = pages['/thumbs/jpg'].images.thumb
          assert(jpg.dimensions)
          assert.equal(jpg.dimensions.width, 170)
          assert.equal(jpg.dimensions.height, 170)

          // const svg = pages['/thumbs/svg'].images.thumbnail
          // assert(svg.dimensions)
          // assert.equal(svg.dimensions.width, 170)
          // assert.equal(svg.dimensions.height, 170)
        })

        it('includes exif data', function(){
          const jpg = pages['/thumbs/jpg'].images.thumb
          assert(jpg.exif)
          assert(jpg.exif.imageSize)
          assert.equal(jpg.exif.imageSize.width, 170)
          assert.equal(jpg.exif.imageSize.height, 170)
        })

        it('includes color data as hex strings', function(){
          var colors = pages['/thumbs/gif'].images.thumb.colors
          assert(Array.isArray(colors))
          assert(colors.length)
          assert(colors[0].match(/^#[0-9a-f]{3,6}$/i))
        })
      })

      describe('data', function(){
        var page

        before(function(){
          page = pages['/thumbs']
        })

        it("attaches data from JSON files to pages in the same directory", function () {
          assert.equal(page.data.some_json_data.name, "cookie monster")
          assert.equal(page.data.some_json_data.food, "cookies")
        })

        it("attaches data from YML files too", function () {
          assert.equal(page.data.some_yml_data.name, "Bert")
          assert.equal(page.data.some_yml_data.friend, "Ernie")
        })

        it('injects data into templates', function(){
          assert(page.content.processed.indexOf('His name is cookie monster') > -1)
          assert(page.content.processed.indexOf('Another character is Bert') > -1)
        })

        it('includes the `pages` object in the context')//, function(){
          // assert(page.content.processed.indexOf('<li>/other</li>') > -1)
          // assert(page.content.processed.indexOf('<li>/other/papayas</li>') > -1)
        // })
      })

      // describe('ancestors', function(){
      //   it('does not have a parent if in top-level directory', function () {
      //     var page = pages['/']
      //     assert(page)
      //     assert(!page.parent)
      //   })
      //
      //   it('has a `parent` and `parentName` if nested', function () {
      //     var page = pages['/other/papayas']
      //     assert.equal(page.parent, '/other')
      //     assert.equal(page.parentName, 'other')
      //   })
      //
      //   it('has a `grandparent` and `grandparentName` if deeply nested', function () {
      //     var page = pages['/other/nested/coconut']
      //     assert.equal(page.parent, '/other/nested')
      //     assert.equal(page.parentName, 'nested')
      //
      //     assert.equal(page.grandparent, '/other')
      //     assert.equal(page.grandparentName, 'other')
      //   })
      // })
    })
  })
})