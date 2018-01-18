/**
 * These are Mocha's scripts, powered by nps.
 * @example
 * ```sh
 * # show help
 * $ npm start
 * ```
 * @example
 * ```sh
 * # run reporter tests for Node.js
 * $ npm start test.node.reporters
 * ```
 * @see https://npm.im/nps
 */

'use strict';

const path = require('path');
const fs = require('fs');
const {series, commonTags, concurrent, crossEnv} = require('nps-utils');
const {oneLine} = commonTags;

const MOCHA_BIN = path.join('bin', 'mocha');

/**
 * Generates a command to run mocha tests with or without test coverage
 * as desired for the current runmode.
 * @param {string} testName The name of the test to be used for coverage reporting.
 * @param {string} mochaParams Parameters for the mocha CLI to execute the desired test.
 * @returns {string} Command string to be executed by nps.
 */
const test = (testName, mochaParams) => oneLine`${process.env.COVERAGE
  ? `nyc --no-clean --report-dir coverage/reports/${testName}`
  : ''} node ${MOCHA_BIN} ${mochaParams}
  `;

// each of these tests should be run individually when running concurrent tests
// because they are slow
const nodeIntegrationTestScripts = fs.readdirSync('test/integration')
  .reduce((acc, filename) => {
    if (/.spec$/.test(path.parse(filename).name)) {
      const name = filename.slice(0, -8); // remove all extensions
      acc[name] = {
        script: test(name, oneLine`
        --timeout 5000
        --slow 500
        test/integration/${filename}
        `),
        description: `Run Node.js "${name}" integration tests`
      };
    }
    return acc;
  }, {});

const nodeIntegrationTestNames = Object.keys(nodeIntegrationTestScripts)
  .map(name => `test.node.integration.${name}`);

const nodeOnlyTestNames = [
  'test.node.only.bdd',
  'test.node.only.tdd',
  'test.node.only.bddRequire',
  'test.node.only.globalBdd',
  'test.node.only.globalTdd',
  'test.node.only.globalQunit'
];

const nodeTestNames = [
  'test.node.bdd',
  'test.node.tdd',
  'test.node.qunit',
  'test.node.exports',
  'test.node.unit',
  ...nodeIntegrationTestNames,
  'test.node.jsapi',
  'test.node.compilers.coffee',
  'test.node.compilers.custom',
  'test.node.compilers.multiple',
  'test.node.requires',
  'test.node.reporters',
  ...nodeOnlyTestNames
];

const browserTestNames = [
  'test.browser.unit',
  'test.browser.bdd',
  'test.browser.tdd',
  'test.browser.qunit',
  'test.browser.esm'
];

exports.scripts = {
  build: {
    script: oneLine`
      browserify ./browser-entry
      --plugin ./scripts/dedefine
      --ignore 'fs'
      --ignore 'glob'
      --ignore 'path'
      --ignore 'supports-color'
      --outfile mocha.js
      `,
    description: 'Bundle Mocha for the browser'
  },
  lint: {
    default: {
      script: concurrent.nps('lint.code', 'lint.markdown'),
      description: 'Lint code and markdown'
    },
    code: {
      script: 'eslint . "bin/*"',
      description: 'Lint code with ESLint'
    },
    markdown: {
      script: 'markdownlint "*.md" "docs/**/*.md" ".github/*.md"',
      description: 'Lint Markdown files'
    }
  },
  clean: {
    script: 'rimraf mocha.js',
    description: 'Delete mocha.js build artifact'
  },
  test: {
    default: {
      script: series('nps clean',
        'nps build',
        concurrent.nps('lint.code',
          'lint.markdown',
          ...nodeTestNames,
          ...browserTestNames
        )
      ),
      description: 'Lint code, run Node.js and browser tests'
    },
    node: {
      default: {
        script: concurrent.nps(...nodeTestNames),
        description: 'Run Node.js tests'
      },
      bdd: {
        script: test('bdd', '--ui bdd test/interfaces/bdd.spec'),
        description: 'Test Node.js BDD interface'
      },
      tdd: {
        script: test('tdd', '--ui tdd test/interfaces/tdd.spec'),
        description: 'Test Node.js TDD interface'
      },
      qunit: {
        script: test('qunit', '--ui qunit test/interfaces/qunit.spec'),
        description: 'Test Node.js QUnit interace'
      },
      exports: {
        script: test('exports', '--ui exports test/interfaces/exports.spec'),
        description: 'Test Node.js exports interface'
      },
      unit: {
        script: test('unit', oneLine`
          "test/unit/*.spec.js"
          "test/node-unit/*.spec.js"
          `),
        description: 'Run Node.js unit tests'
      },
      integration: Object.assign({
        default: {
          script: concurrent.nps(...nodeIntegrationTestNames),
          description: 'Run Node.js integration tests'
        }
      }, nodeIntegrationTestScripts),
      jsapi: {
        script: 'node test/jsapi',
        description: 'Run Mocha API tests'
      },
      compilers: {
        default: {
          script: concurrent.nps('test.node.compilers.coffee',
            'test.node.compilers.custom',
            'test.node.compilers.multiple'
          ),
          description: 'Test deprecated --compilers flag'
        },
        coffee: {
          script: test(
            'compilers-coffee',
            '--compilers coffee:coffee-script/register test/compiler'
          ),
          description: 'Run coffeescript compiler tests using deprecated --compilers flag'
        },
        custom: {
          script: test(
            'compilers-custom',
            '--compilers foo:./test/compiler-fixtures/foo.fixture test/compiler'
          ),
          description: 'Run custom compiler test using deprecated --compilers flag'
        },
        multiple: {
          script: test(
            'compilers-multiple',
            '--compilers coffee:coffee-script/register,foo:./test/compiler-fixtures/foo.fixture test/compiler'
          ),
          description: 'Test deprecated --compilers flag using multiple compilers'
        }
      },
      requires: {
        script: test('requires', `oneLine
          --require coffee-script/register
          --require test/require/a.js
          --require test/require/b.coffee
          --require test/require/c.js
          --require test/require/d.coffee
          test/require/require.spec.js
        `),
        description: 'Test --require flag'
      },
      reporters: {
        script: test('reporters', '"test/reporters/*.spec.js"'),
        description: 'Test reporters'
      },
      only: {
        default: {
          script: concurrent.nps(...nodeOnlyTestNames),
          description: 'Run all tests for .only()'
        },
        bdd: {
          script: test('only-bdd', oneLine`
            --ui bdd
            test/only/bdd.spec
            `),
          description: 'Test .only() with BDD interface'
        },
        tdd: {
          script: test('only-tdd', oneLine`
            --ui tdd
            test/only/tdd.spec
            `),
          description: 'Test .only() with TDD interface'
        },
        bddRequire: {
          script: test('only-bdd-require', oneLine`
            --ui qunit
            test/only/bdd-require.spec
            `),
          description: 'Test .only() with require("mocha") interface'
        },
        globalBdd: {
          script: test('global-only-bdd', oneLine`
            --ui bdd
            test/only/global/bdd.spec
            `),
          description: 'Test .only() in root suite with BDD interface'
        },
        globalTdd: {
          script: test('global-only-tdd', oneLine`
            --ui tdd
            test/only/global/tdd.spec
            `),
          description: 'Test .only() in root suite with TDD interface'
        },
        globalQunit: {
          script: test('global-only-qunit', oneLine`
            --ui qunit
            test/only/global/qunit.spec
            `),
          description: 'Test .only() in root suite with QUnit interface'
        }
      }
    },
    browser: {
      default: {
        script: series('nps clean',
          'nps build',
          concurrent.nps(...browserTestNames)
        ),
        description: 'Compile Mocha and run all tests in browser environment'
      },
      unit: {
        script: crossEnv('NODE_PATH=. karma start --single-run'),
        description: 'Run unit tests for Mocha in browser'
      },
      bdd: {
        script: crossEnv('MOCHA_TEST=bdd nps test.browser.unit'),
        description: 'Test BDD interface in browser'
      },
      tdd: {
        script: crossEnv('MOCHA_TEST=tdd nps test.browser.unit'),
        description: 'Test TDD interface in browser'
      },
      qunit: {
        script: crossEnv('MOCHA_TEST=qunit nps test.browser.unit'),
        description: 'Test QUnit interface in browser'
      },
      esm: {
        script: crossEnv('MOCHA_TEST=esm nps test.browser.unit'),
        description: 'Test mocha ESM support'
      }
    },
    nonTTY: {
      default: {
        script: concurrent.nps('test.nonTTY.dot',
          'test.nonTTY.list',
          'test.nonTTY.spec'
        ),
        description: 'Run all tests for non-TTY terminals'
      },
      dot: {
        script: test('non-tty-dot', oneLine`
          --reporter dot
          test/interfaces/bdd.spec 2>&1 > /tmp/dot.out &&
          echo "dot:" &&
          cat /tmp/dot.out
         `),
        description: 'Test non-TTY dot reporter'
      },
      list: {
        script: test('non-tty-list', oneLine`
          --reporter list
          test/interfaces/bdd.spec 2>&1 > /tmp/list.out &&
          echo "list:" &&
          cat /tmp/list.out
          `),
        description: 'Test non-TTY list reporter'
      },
      spec: {
        script: test('non-tty-dot', oneLine`
          --reporter spec
          test/interfaces/bdd.spec 2>&1 > /tmp/spec.out &&
          echo "spec:" &&
          cat /tmp/spec.out
          `),
        description: 'Test non-TTY spec reporter'
      }
    }
  },
  coveralls: {
    script: 'nyc report --reporter=text-lcov | coveralls',
    description: 'Send code coverage report to Coveralls'
  },
  docs: {
    default: {
      script: series.nps('docs.toc', 'docs.build', 'docs.optimize'),
      description: 'Build & optimize mochajs.org'
    },
    build: {
      script: oneLine`
        bundle exec jekyll build
        --source ./docs
        --destination ./docs/_site
        --config ./docs/_config.yml
        --safe --drafts
        `,
      description: 'Build mochajs.org with Jekyll'
    },
    optimize: {
      script: series(oneLine`
        buildProduction docs/_site/index.html
        --outroot docs/_dist
        --canonicalroot https://mochajs.org/
        --optimizeimages
        --svgo
        --inlinehtmlimage 9400
        --inlinehtmlscript 0
        --asyncscripts
        `,
        'ncp docs/_headers docs/_dist/_headers',
        'node scripts/netlify-headers.js >> docs/_dist/_headers'
      ),
      description: 'Optimize previously built mochajs.org'
    },
    toc: {
      script: series('rimraf docs/_dist', 'node scripts/docs-update-toc.js'),
      description: 'Rebuild mochajs.org Table of Contents'
    },
    watch: {
      script: series('nps docs.toc', oneLine`
        bundle exec jekyll serve
        --source ./docs
        --destination ./docs/_site
        --config ./docs/_config.yml
        --safe
        --drafts
        --watch
        `),
      description: 'Serve documentation locally & watch for changes'
    }
  }
};
