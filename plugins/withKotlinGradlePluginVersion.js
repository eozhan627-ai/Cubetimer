const { withProjectBuildGradle } = require('expo/config-plugins');

module.exports = function withKotlinGradlePluginVersion(config) {
    return withProjectBuildGradle(config, (cfg) => {
        const classpath = "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')";
        if (!cfg.modResults.contents.includes(classpath)) return cfg;
        cfg.modResults.contents = cfg.modResults.contents
            .replace(
                'buildscript {',
                "buildscript {\n  ext.kotlinVersion = findProperty('android.kotlinVersion') ?: '2.0.21'"
            )
            .replace(
                classpath,
                'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:$kotlinVersion")'
            );
        return cfg;
    });
};