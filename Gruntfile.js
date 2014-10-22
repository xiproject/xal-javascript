module.exports = function(grunt) {

    grunt.initConfig({
        jshint: {
            all: ['Gruntfile.js', 'lib/**/*.js', 'test/**/*.js'],
            options: {
                camelcase: true,
                curly: true,
                eqeqeq: true,
                forin: true,
                quotmark: true,
                undef: true,
                unused: true,
                node: true
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
        }
    });

    grunt.registerTask('test', ['jshint', 'jsbeautifier:test']);
    grunt.registerTask('beautify', ['jsbeautifier:default']);

    grunt.loadNpmTasks('grunt-contrib-jshint');
    grunt.loadNpmTasks('grunt-jsbeautifier');
};
