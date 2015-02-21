'use strict';

module.exports = function(grunt) {

    grunt.initConfig({
        env: {
            test: {
                NODE_ENV: 'test'
            }
        },
        jshint: {
            src: {
                src: ['Gruntfile.js', 'lib/**/*.js']
            },
            test: {
                src: ['test/**/*.js'],
                options: {
                    // Many functions are defined by the mocha
                    // test runner, and throw an undefined warning
                    // in JSHint.
                    undef: false
                }
            },
            options: {
                jshintrc: true
            }
        },
        jsbeautifier: {
            default: {
                src: ['lib/**/*.js', 'test/**/*.js']
            },
            test: {
                src: ['lib/**/*.js', 'test/**/*.js'],
                options: {
                    mode: 'VERIFY_ONLY'
                }
            }
        },
        mochaTest: {
            test: {
                src: ['test/**/*.test.js'],
                options: {
                    require: ['coverage/blanket', 'should']
                }
            },
            watch: {
                src: ['test/**/*.js', 'lib/**/*.js']
            },
            coverage: {
                options: {
                    reporter: 'html-cov',
                    quiet: true,
                    captureFile: 'coverage.html'
                },
                src: ['test/**/*.js']
            }


        },
        watch: {
            files: ['lib/**/*.js', 'test/**/*.js'],
            tasks: ['env:test', 'mochaTest:watch']
        },

        jsdoc: {
            dist: {
                src: ['lib/*.js', 'test/*.js'],
                options: {
                    destination: 'doc',
                    template: 'node_modules/grunt-jsdoc/node_modules/ink-docstrap/template',
                    configure: 'node_modules/grunt-jsdoc/node_modules/ink-docstrap/template/jsdoc.conf.json'
                }
            }
        }
    });

    grunt.registerTask('test', ['env:test', 'jshint', 'jsbeautifier:test', 'mochaTest:test']);
    grunt.registerTask('coverage', ['env:test', 'mochaTest:test', 'mochaTest:coverage']);
    grunt.registerTask('beautify', ['jsbeautifier:default']);
    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jsbeautifier');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-env');
    grunt.loadNpmTasks('grunt-contrib-watch');
    grunt.loadNpmTasks('grunt-notify');
    grunt.loadNpmTasks('grunt-jsdoc');
};
