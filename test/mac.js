var exec = require('child_process').exec
var fs = require('fs')
var path = require('path')

var packager = require('..')
var test = require('tape')
var waterfall = require('run-waterfall')

var config = require('./config.json')
var util = require('./util')
var plist = require('plist')
var filterCFBundleIdentifier = require('../mac').filterCFBundleIdentifier

function createIconTest (baseOpts, icon, iconPath) {
  return function (t) {
    t.timeoutAfter(config.timeout)

    var opts = Object.create(baseOpts)
    opts.icon = icon

    var resourcesPath

    waterfall([
      function (cb) {
        packager(opts, cb)
      }, function (paths, cb) {
        resourcesPath = path.join(paths[0], util.generateResourcesPath(opts))
        fs.stat(resourcesPath, cb)
      }, function (stats, cb) {
        t.true(stats.isDirectory(), 'The output directory should contain the expected resources subdirectory')
        util.areFilesEqual(iconPath, path.join(resourcesPath, 'atom.icns'), cb)
      }, function (equal, cb) {
        t.true(equal, 'atom.icns should be identical to the specified icon file')
        cb()
      }
    ], function (err) {
      t.end(err)
    })
  }
}

function createAppVersionTest (baseOpts, appVersion, buildVersion) {
  return function (t) {
    t.timeoutAfter(config.timeout)

    var plistPath
    var opts = Object.create(baseOpts)
    opts['app-version'] = opts['build-version'] = appVersion

    if (buildVersion) {
      opts['build-version'] = buildVersion
    }

    waterfall([
      function (cb) {
        packager(opts, cb)
      }, function (paths, cb) {
        plistPath = path.join(paths[0], opts.name + '.app', 'Contents', 'Info.plist')
        fs.stat(plistPath, cb)
      }, function (stats, cb) {
        t.true(stats.isFile(), 'The expected Info.plist file should exist')
        fs.readFile(plistPath, 'utf8', cb)
      }, function (file, cb) {
        var obj = plist.parse(file)
        t.equal(obj.CFBundleVersion, '' + opts['build-version'], 'CFBundleVersion should reflect build-version')
        t.equal(obj.CFBundleShortVersionString, '' + opts['app-version'], 'CFBundleShortVersionString should reflect app-version')
        t.equal(typeof obj.CFBundleVersion, 'string', 'CFBundleVersion should be a string')
        t.equal(typeof obj.CFBundleShortVersionString, 'string', 'CFBundleShortVersionString should be a string')
        cb()
      }
    ], function (err) {
      t.end(err)
    })
  }
}

function createAppCategoryTypeTest (baseOpts, appCategoryType) {
  return function (t) {
    t.timeoutAfter(config.timeout)

    var plistPath
    var opts = Object.create(baseOpts)
    opts['app-category-type'] = appCategoryType

    waterfall([
      function (cb) {
        packager(opts, cb)
      }, function (paths, cb) {
        plistPath = path.join(paths[0], opts.name + '.app', 'Contents', 'Info.plist')
        fs.stat(plistPath, cb)
      }, function (stats, cb) {
        t.true(stats.isFile(), 'The expected Info.plist file should exist')
        fs.readFile(plistPath, 'utf8', cb)
      }, function (file, cb) {
        var obj = plist.parse(file)
        t.equal(obj.LSApplicationCategoryType, opts['app-category-type'], 'LSApplicationCategoryType should reflect opts.["app-category-type"]')
        cb()
      }
    ], function (err) {
      t.end(err)
    })
  }
}

function createAppBundleTest (baseOpts, appBundleId) {
  return function (t) {
    t.timeoutAfter(config.timeout)

    var plistPath
    var opts = Object.create(baseOpts)
    if (appBundleId) {
      opts['app-bundle-id'] = appBundleId
    }
    var defaultBundleName = 'com.electron.' + opts.name.toLowerCase()
    var appBundleIdentifier = filterCFBundleIdentifier(opts['app-bundle-id'] || defaultBundleName)

    waterfall([
      function (cb) {
        packager(opts, cb)
      }, function (paths, cb) {
        plistPath = path.join(paths[0], opts.name + '.app', 'Contents', 'Info.plist')
        fs.stat(plistPath, cb)
      }, function (stats, cb) {
        t.true(stats.isFile(), 'The expected Info.plist file should exist')
        fs.readFile(plistPath, 'utf8', cb)
      }, function (file, cb) {
        var obj = plist.parse(file)
        t.equal(obj.CFBundleDisplayName, opts.name, 'CFBundleDisplayName should reflect opts.name')
        t.equal(obj.CFBundleName, opts.name, 'CFBundleName should reflect opts.name')
        t.equal(obj.CFBundleIdentifier, appBundleIdentifier, 'CFBundleName should reflect opts["app-bundle-id"] or fallback to default')
        t.equal(typeof obj.CFBundleDisplayName, 'string', 'CFBundleDisplayName should be a string')
        t.equal(typeof obj.CFBundleName, 'string', 'CFBundleName should be a string')
        t.equal(typeof obj.CFBundleIdentifier, 'string', 'CFBundleIdentifier should be a string')
        t.equal(/^[a-zA-Z0-9-.]*$/.test(obj.CFBundleIdentifier), true, 'CFBundleIdentifier should allow only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.)')
        cb()
      }
    ], function (err) {
      t.end(err)
    })
  }
}

function createAppHelpersBundleTest (baseOpts, helperBundleId, appBundleId) {
  return function (t) {
    t.timeoutAfter(config.timeout)

    var tempPath, plistPath
    var opts = Object.create(baseOpts)
    if (helperBundleId) {
      opts['helper-bundle-id'] = appBundleId
    }
    if (appBundleId) {
      opts['app-bundle-id'] = appBundleId
    }
    var defaultBundleName = 'com.electron.' + opts.name.toLowerCase()
    var appBundleIdentifier = filterCFBundleIdentifier(opts['app-bundle-id'] || defaultBundleName)
    var helperBundleIdentifier = filterCFBundleIdentifier(opts['helper-bundle-id'] || appBundleIdentifier + '.helper')

    waterfall([
      function (cb) {
        packager(opts, cb)
      }, function (paths, cb) {
        tempPath = paths[0]
        plistPath = path.join(tempPath, opts.name + '.app', 'Contents', 'Frameworks', opts.name + ' Helper.app', 'Contents', 'Info.plist')
        fs.stat(plistPath, cb)
      }, function (stats, cb) {
        t.true(stats.isFile(), 'The expected Info.plist file should exist in helper app')
        fs.readFile(plistPath, 'utf8', cb)
      }, function (file, cb) {
        var obj = plist.parse(file)
        t.equal(obj.CFBundleName, opts.name, 'CFBundleName should reflect opts.name in helper app')
        t.equal(obj.CFBundleIdentifier, helperBundleIdentifier, 'CFBundleName should reflect opts["helper-bundle-id"], opts["app-bundle-id"] or fallback to default in helper app')
        t.equal(typeof obj.CFBundleName, 'string', 'CFBundleName should be a string in helper app')
        t.equal(typeof obj.CFBundleIdentifier, 'string', 'CFBundleIdentifier should be a string in helper app')
        t.equal(/^[a-zA-Z0-9-.]*$/.test(obj.CFBundleIdentifier), true, 'CFBundleIdentifier should allow only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.)')
        // check helper EH
        plistPath = path.join(tempPath, opts.name + '.app', 'Contents', 'Frameworks', opts.name + ' Helper EH.app', 'Contents', 'Info.plist')
        fs.stat(plistPath, cb)
      }, function (stats, cb) {
        t.true(stats.isFile(), 'The expected Info.plist file should exist in helper EH app')
        fs.readFile(plistPath, 'utf8', cb)
      }, function (file, cb) {
        var obj = plist.parse(file)
        t.equal(obj.CFBundleName, opts.name + ' Helper EH', 'CFBundleName should reflect opts.name in helper EH app')
        t.equal(obj.CFBundleDisplayName, opts.name + ' Helper EH', 'CFBundleDisplayName should reflect opts.name in helper EH app')
        t.equal(obj.CFBundleExecutable, opts.name + ' Helper EH', 'CFBundleExecutable should reflect opts.name in helper EH app')
        t.equal(obj.CFBundleIdentifier, helperBundleIdentifier + '.EH', 'CFBundleName should reflect opts["helper-bundle-id"], opts["app-bundle-id"] or fallback to default in helper EH app')
        t.equal(typeof obj.CFBundleName, 'string', 'CFBundleName should be a string in helper EH app')
        t.equal(typeof obj.CFBundleDisplayName, 'string', 'CFBundleDisplayName should be a string in helper EH app')
        t.equal(typeof obj.CFBundleExecutable, 'string', 'CFBundleExecutable should be a string in helper EH app')
        t.equal(typeof obj.CFBundleIdentifier, 'string', 'CFBundleIdentifier should be a string in helper EH app')
        t.equal(/^[a-zA-Z0-9-.]*$/.test(obj.CFBundleIdentifier), true, 'CFBundleIdentifier should allow only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.)')
        // check helper NP
        plistPath = path.join(tempPath, opts.name + '.app', 'Contents', 'Frameworks', opts.name + ' Helper NP.app', 'Contents', 'Info.plist')
        fs.stat(plistPath, cb)
      }, function (stats, cb) {
        t.true(stats.isFile(), 'The expected Info.plist file should exist in helper NP app')
        fs.readFile(plistPath, 'utf8', cb)
      }, function (file, cb) {
        var obj = plist.parse(file)
        t.equal(obj.CFBundleName, opts.name + ' Helper NP', 'CFBundleName should reflect opts.name in helper NP app')
        t.equal(obj.CFBundleDisplayName, opts.name + ' Helper NP', 'CFBundleDisplayName should reflect opts.name in helper NP app')
        t.equal(obj.CFBundleExecutable, opts.name + ' Helper NP', 'CFBundleExecutable should reflect opts.name in helper NP app')
        t.equal(obj.CFBundleIdentifier, helperBundleIdentifier + '.NP', 'CFBundleName should reflect opts["helper-bundle-id"], opts["app-bundle-id"] or fallback to default in helper NP app')
        t.equal(typeof obj.CFBundleName, 'string', 'CFBundleName should be a string in helper NP app')
        t.equal(typeof obj.CFBundleDisplayName, 'string', 'CFBundleDisplayName should be a string in helper NP app')
        t.equal(typeof obj.CFBundleExecutable, 'string', 'CFBundleExecutable should be a string in helper NP app')
        t.equal(typeof obj.CFBundleIdentifier, 'string', 'CFBundleIdentifier should be a string in helper NP app')
        t.equal(/^[a-zA-Z0-9-.]*$/.test(obj.CFBundleIdentifier), true, 'CFBundleIdentifier should allow only alphanumeric (A-Z,a-z,0-9), hyphen (-), and period (.)')
        cb()
      }
    ], function (err) {
      t.end(err)
    })
  }
}

// Share testing script with platform darwin and mas
module.exports = function (baseOpts) {
  util.setup()
  test('helper app paths test', function (t) {
    t.timeoutAfter(config.timeout)

    function getHelperExecutablePath (helperName) {
      return path.join(helperName + '.app', 'Contents', 'MacOS', helperName)
    }

    var opts = Object.create(baseOpts)
    var frameworksPath

    waterfall([
      function (cb) {
        packager(opts, cb)
      }, function (paths, cb) {
        frameworksPath = path.join(paths[0], opts.name + '.app', 'Contents', 'Frameworks')
        // main Helper.app is already tested in basic test suite; test its executable and the other helpers
        fs.stat(path.join(frameworksPath, getHelperExecutablePath(opts.name + ' Helper')), cb)
      }, function (stats, cb) {
        t.true(stats.isFile(), 'The Helper.app executable should reflect opts.name')
        fs.stat(path.join(frameworksPath, opts.name + ' Helper EH.app'), cb)
      }, function (stats, cb) {
        t.true(stats.isDirectory(), 'The Helper EH.app should reflect opts.name')
        fs.stat(path.join(frameworksPath, getHelperExecutablePath(opts.name + ' Helper EH')), cb)
      }, function (stats, cb) {
        t.true(stats.isFile(), 'The Helper EH.app executable should reflect opts.name')
        fs.stat(path.join(frameworksPath, opts.name + ' Helper NP.app'), cb)
      }, function (stats, cb) {
        t.true(stats.isDirectory(), 'The Helper NP.app should reflect opts.name')
        fs.stat(path.join(frameworksPath, getHelperExecutablePath(opts.name + ' Helper NP')), cb)
      }, function (stats, cb) {
        t.true(stats.isFile(), 'The Helper NP.app executable should reflect opts.name')
        cb()
      }
    ], function (err) {
      t.end(err)
    })
  })
  util.teardown()

  var iconBase = path.join(__dirname, 'fixtures', 'monochrome')
  var icnsPath = iconBase + '.icns'
  util.setup()
  test('icon test: .icns specified', createIconTest(baseOpts, icnsPath, icnsPath))
  util.teardown()

  util.setup()
  test('icon test: .ico specified (should replace with .icns)', createIconTest(baseOpts, iconBase + '.ico', icnsPath))
  util.teardown()

  util.setup()
  test('icon test: basename only (should add .icns)', createIconTest(baseOpts, iconBase, icnsPath))
  util.teardown()

  util.setup()
  test('codesign test', function (t) {
    t.timeoutAfter(config.timeout)

    var opts = Object.create(baseOpts)
    opts.sign = true // Ad-hoc

    var appPath

    waterfall([
      function (cb) {
        packager(opts, cb)
      }, function (paths, cb) {
        appPath = path.join(paths[0], opts.name + '.app')
        fs.stat(appPath, cb)
      }, function (stats, cb) {
        t.true(stats.isDirectory(), 'The expected .app directory should exist')
        exec('codesign -v ' + appPath, cb)
      }, function (stdout, stderr, cb) {
        t.pass('codesign should verify successfully')
        cb()
      }
    ], function (err) {
      var notFound = err && err.code === 127
      if (notFound) console.log('codesign not installed; skipped')
      t.end(notFound ? null : err)
    })
  })
  util.teardown()

  util.setup()
  test('app and build version test', createAppVersionTest(baseOpts, '1.1.0', '1.1.0.1234'))
  util.teardown()

  util.setup()
  test('app version test', createAppVersionTest(baseOpts, '1.1.0'))
  util.teardown()

  util.setup()
  test('app and build version integer test', createAppVersionTest(baseOpts, 12, 1234))
  util.teardown()

  util.setup()
  test('app categoryType test', createAppCategoryTypeTest(baseOpts, 'public.app-category.developer-tools'))
  util.teardown()

  util.setup()
  test('app bundle test', createAppBundleTest(baseOpts, 'com.electron.basetest'))
  util.teardown()

  util.setup()
  test('app bundle (w/ special characters) test', createAppBundleTest(baseOpts, 'com.electron."bãśè tëßt!@#$%^&*()?\''))
  util.teardown()

  util.setup()
  test('app bundle app-bundle-id fallback test', createAppBundleTest(baseOpts))
  util.teardown()

  util.setup()
  test('app helpers bundle test', createAppHelpersBundleTest(baseOpts, 'com.electron.basetest.helper'))
  util.teardown()

  util.setup()
  test('app helpers bundle (w/ special characters) test', createAppHelpersBundleTest(baseOpts, 'com.electron."bãśè tëßt!@#$%^&*()?\'.hęłpėr'))
  util.teardown()

  util.setup()
  test('app helpers bundle helper-bundle-id fallback to app-bundle-id test', createAppHelpersBundleTest(baseOpts, null, 'com.electron.basetest'))
  util.teardown()

  util.setup()
  test('app helpers bundle helper-bundle-id fallback to app-bundle-id (w/ special characters) test', createAppHelpersBundleTest(baseOpts, null, 'com.electron."bãśè tëßt!!@#$%^&*()?\''))
  util.teardown()

  util.setup()
  test('app helpers bundle helper-bundle-id & app-bundle-id fallback test', createAppHelpersBundleTest(baseOpts))
  util.teardown()
}
