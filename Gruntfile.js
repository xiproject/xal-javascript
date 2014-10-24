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
                src: ['test/**/*.test.js']
            }
        }
    });

    grunt.registerTask('test', ['env:test', 'jshint', 'jsbeautifier:test', 'mochaTest:test']);
    grunt.registerTask('beautify', ['jsbeautifier:default']);

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jsbeautifier');
    grunt.loadNpmTasks('grunt-mocha-test');
    grunt.loadNpmTasks('grunt-env');
};
