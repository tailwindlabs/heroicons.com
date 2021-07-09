const { createLoader } = require('simple-functional-loader')

module.exports = {
  images: {
    disableStaticImages: true,
  },
  webpack(config, options) {
    config.module.rules.push({
      test: /\.svg$/i,
      use: [
        options.defaultLoaders.babel,
        createLoader(function (code) {
          return code.replace(/"(.*?)(?<!\\)"/gs, (_, svg) =>
            svg
              .replace(/>(\s|\\n)+</g, '><')
              .replace(/\\n$/, '')
              .replace(/\\"/g, '"')
              .replace(/(\s)([a-z-]+)="([^"]+)"/gi, (_, prefix, attr, value) => {
                const jsxValue = /^[0-9.]+$/.test(value) ? `{${value}}` : `"${value}"`
                return `${prefix}${attr.replace(
                  /-([a-z])/gi,
                  (_, letter) => `${letter.toUpperCase()}`
                )}=${jsxValue}`
              })
              .replace(
                /<svg[^>]+>(.*?)<\/svg>/s,
                (svg.match(/</g) || []).length > 3 ? '(<>$1</>)' : '($1)'
              )
          )
        }),
        'raw-loader',
      ],
    })

    config.module.rules.push({
      test: /\.(png|jpe?g|gif|webp)$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next',
            name: 'static/media/[name].[hash].[ext]',
          },
        },
      ],
    })

    return config
  },
}
