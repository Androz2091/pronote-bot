module.exports = {
    env: {
        commonjs: true,
        es2020: true,
        node: true
    },
    extends: [
        'google'
    ],
    parserOptions: {
        ecmaVersion: 11
    },
    rules: {
        'object-curly-spacing': ['error', 'always'],
        'indent': ['error', 4],
        'comma-dangle': ['error', 'never'],
        'quote-props': ['error', 'consistent-as-needed'],
        'space-before-function-paren': ['error', 'always'],
        'max-len': ['warn', { code: 100 }],
        'padded-blocks': 0,
        'space-before-blocks': 0,
        'require-jsdoc': 0,
        'max-len': 0,
        'brace-style': 0
    }
};
