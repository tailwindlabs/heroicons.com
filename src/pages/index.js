import { useRef, useEffect, useState, memo } from 'react'
import matchSorter from 'match-sorter'
import createStore from 'zustand'
import clsx from 'clsx'
import tags from '../data/tags'
import Alert from '@reach/alert'
import { Transition } from '@headlessui/react'
import Head from 'next/head'

const ENTER = 13
const UP = 38
const DOWN = 40
const SPACE = 32
const ESC = 27

const SHARE_LINK = `https://twitter.com/intent/tweet?text=${encodeURIComponent(
  'Check out Heroicons by @steveschoger and the @tailwindcss team 😍'
)}&url=${encodeURIComponent('https://heroicons.com')}`

function importIcons(r, type, attrs) {
  return r.keys().map((fileName) => {
    const name = fileName.substr(2).replace(/\.svg$/, '')
    return {
      name,
      type,
      tags: tags[name] || [],
      svg: r(fileName).default,
      attrs,
    }
  })
}

const iconsMedium = importIcons(require.context(`heroicons/outline/`, false, /\.svg$/), 'md', {
  width: 24,
  height: 24,
  fill: 'none',
  viewBox: '0 0 24 24',
  stroke: 'currentColor',
})
const iconsSmall = importIcons(require.context(`heroicons/solid/`, false, /\.svg$/), 'sm', {
  width: 20,
  height: 20,
  viewBox: '0 0 20 20',
  fill: 'currentColor',
})
const iconCount = iconsMedium.length

const useStore = createStore((set) => ({
  query: '',
  filter: undefined,
  search: (query) => {
    set({
      query,
      filter: query
        ? matchSorter(iconsMedium, query, { keys: ['name', 'tags'] }).map((x) => x.name)
        : undefined,
    })
  },
}))

function stringifyAttrs(attrs, filter = () => true) {
  let str = Object.keys(attrs)
    .filter(filter)
    .map((attr) =>
      /^[0-9.]+$/.test(attrs[attr]) ? `${attr}={${attrs[attr]}}` : `${attr}="${attrs[attr]}"`
    )
    .join(' ')
  if (str) return ` ${str}`
  return str
}

function castArray(value) {
  return Array.isArray(value) ? value : [value]
}

function serialize(component) {
  let code = ''
  let { children, ...props } = component.props
  if (typeof component.type === 'string') {
    if (children) {
      code += `<${component.type}${stringifyAttrs(props)}>${castArray(children)
        .map(serialize)
        .join('')}</${component.type}>`
    } else {
      code += `<${component.type}${stringifyAttrs(props)} />`
    }
  } else {
    code += castArray(children).map(serialize).join('')
  }
  return code
}

function copyIcon(icon, as) {
  let jsx =
    `<svg` +
    stringifyAttrs(
      {
        xmlns: 'http://www.w3.org/2000/svg',
        ...(icon.type === 'sm' ? { className: 'h-5 w-5' } : { className: 'h-6 w-6' }),
        ...icon.attrs,
      },
      (a) => !['width', 'height'].includes(a)
    ) +
    `>` +
    serialize(icon.svg) +
    `</svg>`

  let indent = 1
  jsx = jsx
    .replace(/(\/?>)(<\/?)/g, (_, gt, lt) => {
      let closing = /^\//.test(gt) || /\/$/.test(lt)
      let bothClosing = /^\//.test(gt) && /\/$/.test(lt)
      if (closing) {
        indent--
      }
      if (bothClosing) {
        indent--
      }
      let str = `${gt}\n` + '  '.repeat(Math.max(indent, 0)) + lt
      if (!closing) {
        indent++
      }
      return str
    })
    .replace(/"\/>/g, '" />')

  if (as === 'jsx') {
    return navigator.clipboard.writeText(jsx)
  }

  let svg = jsx
    .replace('className=', 'class=')
    .replace(/=\{([^}]+)\}/g, '="$1"')
    .replace(
      /(\s)([a-z]+)="/gi,
      (_, ws, attr) =>
        ws + attr.replace(/([a-z])([A-Z])/g, (_, p1, p2) => `${p1}-${p2.toLowerCase()}`) + '="'
    )
    .replace('view-box=', 'viewBox=')

  return navigator.clipboard.writeText(svg)
}

const Icon = memo(({ icon }) => {
  const [state, setState] = useState('idle')
  const [activeType, setActiveType] = useState(undefined)

  function copy(as) {
    if (state === 'copied') return
    copyIcon(icon, as).then(() => {
      setState('copied')
    })
  }

  function activate() {
    if (state === 'idle') {
      setState('active')
    }
  }

  function deactivate() {
    if (state === 'active') {
      setState('idle')
      setActiveType(undefined)
    }
  }

  function onKeyDown(e) {
    if ([ENTER, SPACE, UP, DOWN, ESC].includes(e.which)) {
      e.preventDefault()
    }
    if (state === 'active' && e.which === ESC) {
      setState('idle')
      setActiveType(undefined)
    } else if (state === 'idle' && [ENTER, SPACE, DOWN].includes(e.which)) {
      setState('active')
      setActiveType('svg')
    } else if (activeType === 'svg' && e.which === DOWN) {
      setActiveType('jsx')
    } else if (activeType === 'jsx' && e.which === UP) {
      setActiveType('svg')
    } else if (state === 'active' && activeType && [ENTER, SPACE].includes(e.which)) {
      copy(activeType)
    }
  }

  useEffect(() => {
    if (state === 'copied') {
      const handler = window.setTimeout(() => {
        setState('idle')
      }, 1000)
      return () => {
        window.clearTimeout(handler)
      }
    }
  }, [state])

  return (
    <li
      className={clsx('relative flex flex-col-reverse', {
        group: state === 'active',
      })}
      onMouseEnter={activate}
      onMouseLeave={deactivate}
      onClick={activate}
    >
      <h3 id={`${icon.name}-name`}>
        {icon.name}
        {icon.tags.includes('new') && (
          <small
            className={clsx(
              'absolute top-px right-px mt-1 mr-1 rounded-full text-xs leading-5 font-medium px-2 pointer-events-none bg-yellow-100 text-orange-700 transition-opacity',
              {
                'opacity-0 duration-100': state === 'active',
                'duration-200': state !== 'active',
              }
            )}
          >
            <span className="sr-only">(</span>New
            <span className="sr-only">)</span>
          </small>
        )}
      </h3>
      <div className="relative mb-3 h-24">
        <button
          type="button"
          onKeyDown={onKeyDown}
          onBlur={() => {
            window.setTimeout(() => {
              deactivate()
            }, 0)
          }}
          id={`${icon.name}-${icon.type}-btn`}
          aria-label={icon.name}
          aria-haspopup="true"
          aria-controls={`${icon.name}-${icon.type}`}
          aria-expanded={state === 'active' ? true : undefined}
          className="absolute inset-0 w-full flex items-center justify-center rounded-lg border border-gray-200 cursor-auto"
        >
          <svg
            {...icon.attrs}
            className={clsx('transform transition-transform', {
              '-translate-y-3 duration-200 ease-out': state === 'copied',
              'duration-500 ease-in-out': state !== 'copied',
            })}
          >
            {icon.svg}
          </svg>
        </button>
        <Transition
          show={state === 'copied'}
          enter="transition-opacity duration-300 ease-out"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-300 ease-out"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {(ref) => (
            <Alert
              ref={ref}
              className="absolute bottom-1 left-0 right-0 pointer-events-none text-center font-medium pb-4 text-purple-700"
            >
              Copied<span className="sr-only"> {icon.name}</span>!
            </Alert>
          )}
        </Transition>
        <Transition
          show={state === 'active'}
          enter="transition-opacity duration-100 ease-in-out"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="transition-opacity duration-200 ease-in-out"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          {(ref) => (
            <div
              ref={ref}
              id={`${icon.name}-${icon.type}`}
              role="menu"
              aria-labelledby={`${icon.name}-${icon.type}-btn`}
              tabIndex={-1}
              aria-activedescendant={
                activeType ? `${icon.name}-${icon.type}-${activeType}` : undefined
              }
              className={clsx('absolute inset-0 z-10 p-1', {
                'pointer-events-none': state !== 'active',
              })}
            >
              <div className="absolute top-1/2 left-1/2 w-8 h-8 -ml-4 -mt-4 bg-white bg-opacity-75" />
              <div
                id={`${icon.name}-${icon.type}-svg`}
                tabIndex={-1}
                role="menuitem"
                className={clsx(
                  'relative cursor-pointer leading-[42px] font-medium bg-purple-200 rounded-md text-purple-700 transition-colors duration-150 outline-none',
                  { 'bg-opacity-25': activeType !== 'svg' },
                  { 'bg-opacity-75': activeType === 'svg' }
                )}
                onMouseEnter={() => setActiveType('svg')}
                onMouseLeave={() => setActiveType(undefined)}
                onClick={() => copy('svg')}
              >
                Copy SVG
              </div>
              <div
                id={`${icon.name}-${icon.type}-jsx`}
                tabIndex={-1}
                role="menuitem"
                className={clsx(
                  'relative cursor-pointer mt-1 leading-[42px] font-medium bg-purple-200 rounded-md text-purple-700 transition-colors duration-150 outline-none',
                  { 'bg-opacity-25': activeType !== 'jsx' },
                  { 'bg-opacity-75': activeType === 'jsx' }
                )}
                onMouseEnter={() => setActiveType('jsx')}
                onMouseLeave={() => setActiveType(undefined)}
                onClick={() => copy('jsx')}
              >
                Copy JSX
              </div>
            </div>
          )}
        </Transition>
      </div>
    </li>
  )
})

function Icons({ icons, className = '', filter }) {
  const [renderAll, setRenderAll] = useState(false)

  useEffect(() => {
    setRenderAll(true)
  }, [])

  const filteredIcons = filter
    ? icons
        .filter((icon) => filter.indexOf(icon.name) !== -1)
        .sort((a, b) => filter.indexOf(a.name) - filter.indexOf(b.name))
    : icons

  return (
    <ul
      className={`grid gap-8 text-center text-xs leading-4 ${className}`}
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(132px, 1fr))' }}
    >
      {filteredIcons.slice(0, renderAll ? undefined : 38).map((icon, i) => (
        <Icon key={icon.name} icon={icon} />
      ))}
    </ul>
  )
}

function Header({ version }) {
  return (
    <header className="bg-gradient-to-r from-purple-700 to-[#a65fec] px-4 sm:px-6 lg:px-16">
      <div className="max-w-10xl mx-auto divide-y divide-black divide-opacity-10">
        <div className="py-6 flex items-center text-sm leading-5">
          <svg width="168" height="34" fill="none">
            <path
              d="M55.436 12.608c-1.876 0-3.332.7-4.172 1.96V7.4h-3.612V27h3.612v-7.56c0-2.436 1.316-3.472 3.08-3.472 1.624 0 2.772.98 2.772 2.884V27h3.612v-8.596c0-3.724-2.324-5.796-5.292-5.796zm10.868 8.876H76.86c.084-.476.14-.952.14-1.484 0-4.116-2.94-7.392-7.084-7.392-4.396 0-7.392 3.22-7.392 7.392 0 4.172 2.968 7.392 7.672 7.392 2.688 0 4.788-1.092 6.104-2.996l-2.912-1.68c-.616.812-1.736 1.4-3.136 1.4-1.904 0-3.444-.784-3.948-2.632zm-.056-2.8c.42-1.792 1.736-2.828 3.668-2.828 1.512 0 3.024.812 3.472 2.828h-7.14zm16.326-3.276V13h-3.612v14h3.612v-6.692c0-2.94 2.38-3.78 4.256-3.556V12.72c-1.764 0-3.528.784-4.256 2.688zm11.953 11.984c4.116 0 7.42-3.22 7.42-7.392 0-4.172-3.304-7.392-7.42-7.392s-7.392 3.22-7.392 7.392c0 4.172 3.276 7.392 7.392 7.392zm0-3.528c-2.128 0-3.78-1.596-3.78-3.864s1.652-3.864 3.78-3.864c2.156 0 3.808 1.596 3.808 3.864s-1.652 3.864-3.808 3.864zM105.72 11.32c1.232 0 2.24-1.008 2.24-2.212 0-1.204-1.008-2.24-2.24-2.24-1.204 0-2.212 1.036-2.212 2.24a2.235 2.235 0 002.212 2.212zM103.928 27h3.612V13h-3.612v14zm13.022.392c2.744 0 5.124-1.456 6.328-3.64l-3.136-1.792c-.56 1.148-1.764 1.848-3.22 1.848-2.156 0-3.752-1.596-3.752-3.808 0-2.24 1.596-3.836 3.752-3.836 1.428 0 2.632.728 3.192 1.876l3.108-1.82c-1.148-2.156-3.528-3.612-6.272-3.612-4.256 0-7.392 3.22-7.392 7.392 0 4.172 3.136 7.392 7.392 7.392zm14.123 0c4.116 0 7.42-3.22 7.42-7.392 0-4.172-3.304-7.392-7.42-7.392s-7.392 3.22-7.392 7.392c0 4.172 3.276 7.392 7.392 7.392zm0-3.528c-2.128 0-3.78-1.596-3.78-3.864s1.652-3.864 3.78-3.864c2.156 0 3.808 1.596 3.808 3.864s-1.652 3.864-3.808 3.864zm17.185-11.256c-1.876 0-3.332.7-4.172 1.96V13h-3.612v14h3.612v-7.56c0-2.436 1.316-3.472 3.08-3.472 1.624 0 2.772.98 2.772 2.884V27h3.612v-8.596c0-3.724-2.324-5.796-5.292-5.796zm11.148 4.368c0-.756.728-1.148 1.624-1.148 1.036 0 1.82.532 2.24 1.428l3.08-1.68c-1.092-1.932-3.052-2.968-5.32-2.968-2.884 0-5.32 1.596-5.32 4.452 0 4.928 7.224 3.808 7.224 5.852 0 .812-.784 1.204-1.932 1.204-1.4 0-2.352-.672-2.744-1.82l-3.136 1.764c1.008 2.156 3.08 3.332 5.88 3.332 2.996 0 5.628-1.456 5.628-4.48 0-5.152-7.224-3.864-7.224-5.936z"
              fill="#fff"
            />
            <path
              d="M16 4.542a23.234 23.234 0 0013.713 4.83c.189 1.083.287 2.198.287 3.338 0 8.825-5.915 16.274-14 18.589C7.915 28.984 2 21.535 2 12.71c0-1.14.098-2.256.287-3.34A23.234 23.234 0 0016 4.543z"
              stroke="#AC94FA"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="flex space-x-10 ml-auto">
            <a
              href={SHARE_LINK}
              className="flex items-center space-x-2 text-white hover:text-purple-200 transition-colors duration-150 font-semibold"
            >
              <svg width="20" height="20" fill="currentColor" className="text-white opacity-40">
                <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
              </svg>
              <p>
                Share<span className="sr-only sm:not-sr-only"> on Twitter</span>
              </p>
            </a>
            <a
              href="https://classic.heroicons.com"
              className="hidden md:block group text-purple-200"
            >
              Looking for Heroicons Classic?{' '}
              <strong className="font-semibold text-white group-hover:text-purple-200 transition-colors duration-150">
                Get them here &rarr;
              </strong>
            </a>
          </div>
        </div>
        <div className="sm:pt-4 pb-10 sm:pb-14 flex flex-wrap items-center">
          <div className="w-full flex-none text-center xl:w-auto xl:flex-auto xl:text-left mt-10">
            <h1 className="font-display text-white text-3xl leading-9 font-semibold sm:text-4xl sm:leading-10">
              Beautiful hand-crafted SVG icons,{' '}
              <span className="sm:block text-purple-300">
                by the makers of <a href="https://tailwindcss.com">Tailwind CSS</a>.
              </span>
            </h1>
            <div className="flex flex-wrap justify-center xl:justify-start whitespace-no-wrap text-purple-100 font-medium mt-3 leading-5">
              <div className="flex items-center mx-3 sm:mx-4 xl:ml-0 xl:mr-8 mt-3">
                <div className="mr-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="text-purple-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>{iconsMedium.length} Icons</div>
              </div>
              <div className="flex items-center mx-3 sm:mx-4 xl:ml-0 xl:mr-8 mt-3">
                <div className="mr-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="text-purple-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 2a1 1 0 011 1v1.323l3.954 1.582 1.599-.8a1 1 0 01.894 1.79l-1.233.616 1.738 5.42a1 1 0 01-.285 1.05A3.989 3.989 0 0115 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.715-5.349L11 6.477V16h2a1 1 0 110 2H7a1 1 0 110-2h2V6.477L6.237 7.582l1.715 5.349a1 1 0 01-.285 1.05A3.989 3.989 0 015 15a3.989 3.989 0 01-2.667-1.019 1 1 0 01-.285-1.05l1.738-5.42-1.233-.617a1 1 0 01.894-1.788l1.599.799L9 4.323V3a1 1 0 011-1zm-5 8.274l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L5 10.274zm10 0l-.818 2.552c.25.112.526.174.818.174.292 0 .569-.062.818-.174L15 10.274z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>MIT Licensed</div>
              </div>
              <div className="flex items-center mx-3 sm:mx-4 xl:mx-0 mt-3">
                <div className="mr-2">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="text-purple-400"
                  >
                    <path
                      fillRule="evenodd"
                      d="M12.316 3.051a1 1 0 01.633 1.265l-4 12a1 1 0 11-1.898-.632l4-12a1 1 0 011.265-.633zM5.707 6.293a1 1 0 010 1.414L3.414 10l2.293 2.293a1 1 0 11-1.414 1.414l-3-3a1 1 0 010-1.414l3-3a1 1 0 011.414 0zm8.586 0a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 11-1.414-1.414L16.586 10l-2.293-2.293a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div>React + Vue Libraries</div>
              </div>
            </div>
          </div>
          <div className="w-full sm:w-auto flex-none flex flex-col-reverse sm:flex-row sm:items-start space-y-3 space-y-reverse sm:space-y-0 sm:space-x-4 mt-10 mx-auto xl:mx-0">
            <div>
              <a href={`https://github.com/tailwindlabs/heroicons`} className="group flex">
                <div className="w-full sm:w-auto inline-flex items-center justify-center text-purple-900 group-hover:text-purple-500 font-medium leading-none bg-white rounded-lg shadow-sm group-hover:shadow-lg py-3 px-5 border border-transparent transform group-hover:-translate-y-0.5 transition-all duration-150">
                  <svg
                    width="24"
                    height="24"
                    fill="currentColor"
                    className="text-purple-600 mr-3 text-opacity-50 transform"
                  >
                    <path
                      fillRule="evenodd"
                      clipRule="evenodd"
                      d="M12 2C6.477 2 2 6.463 2 11.97c0 4.404 2.865 8.14 6.839 9.458.5.092.682-.216.682-.48 0-.236-.008-.864-.013-1.695-2.782.602-3.369-1.337-3.369-1.337-.454-1.151-1.11-1.458-1.11-1.458-.908-.618.069-.606.069-.606 1.003.07 1.531 1.027 1.531 1.027.892 1.524 2.341 1.084 2.91.828.092-.643.35-1.083.636-1.332-2.22-.251-4.555-1.107-4.555-4.927 0-1.088.39-1.979 1.029-2.675-.103-.252-.446-1.266.098-2.638 0 0 .84-.268 2.75 1.022A9.606 9.606 0 0112 6.82c.85.004 1.705.114 2.504.336 1.909-1.29 2.747-1.022 2.747-1.022.546 1.372.202 2.386.1 2.638.64.696 1.028 1.587 1.028 2.675 0 3.83-2.339 4.673-4.566 4.92.359.307.678.915.678 1.846 0 1.332-.012 2.407-.012 2.734 0 .267.18.577.688.48C19.137 20.107 22 16.373 22 11.969 22 6.463 17.522 2 12 2z"
                    />
                  </svg>
                  <span>Documentation</span>
                </div>
              </a>
            </div>
            <a
              href="https://www.figma.com/community/file/958423903283802665/heroiconsZ"
              className="group flex"
            >
              <div className="w-full sm:w-auto inline-flex items-center justify-center text-white font-medium bg-white bg-opacity-20 group-hover:bg-opacity-30 rounded-lg shadow-sm group-hover:shadow-lg py-3 px-5 border border-white border-opacity-10 transform group-hover:-translate-y-0.5 transition-all duration-150">
                <svg
                  width="24"
                  height="24"
                  fill="currentColor"
                  className="text-white mr-3 text-opacity-75 transform"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.037 5.785a3.747 3.747 0 013.748-3.748h6.43a3.747 3.747 0 012.056 6.882 3.747 3.747 0 01-2.056 6.881h-.08c-.971 0-1.856-.37-2.521-.975v3.454c0 2.097-1.722 3.788-3.81 3.788-2.064 0-3.767-1.672-3.767-3.747 0-1.31.673-2.464 1.692-3.134a3.744 3.744 0 01-1.692-3.134c0-1.31.673-2.464 1.692-3.133a3.744 3.744 0 01-1.692-3.134zm6.349 3.747v5.04H8.767a2.52 2.52 0 01.018-5.04h2.6zM8.785 15.8h-.018a2.52 2.52 0 00-2.502 2.52c0 1.386 1.143 2.52 2.54 2.52 1.42 0 2.58-1.152 2.58-2.56V15.8h-2.6zm0-12.535a2.52 2.52 0 100 5.04h2.6v-5.04h-2.6zm3.83 0v5.04h2.6a2.52 2.52 0 000-5.04h-2.6zm0 8.787a2.52 2.52 0 012.52-2.52h.08a2.52 2.52 0 010 5.04h-.08a2.52 2.52 0 01-2.52-2.52z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>Get Figma File</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="bg-gray-50 border-t border-gray-200 py-12 md:py-14 px-4 sm:px-6 lg:px-16 text-sm leading-5">
      <div className="max-w-10xl mx-auto text-center space-y-6 md:space-y-0 md:text-left md:flex">
        <div className="space-y-6 md:space-y-0 md:space-x-10 flex flex-col items-center md:flex-row">
          <div className="flex items-center space-x-2">
            <svg width="30" height="18" fill="#16BDCA">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15 0c-4 0-6.5 2-7.5 6 1.5-2 3.25-2.75 5.25-2.25 1.141.285 1.957 1.113 2.86 2.03C17.08 7.271 18.782 9 22.5 9c4 0 6.5-2 7.5-6-1.5 2-3.25 2.75-5.25 2.25-1.141-.285-1.957-1.113-2.86-2.03C20.42 1.728 18.718 0 15 0zM7.5 9C3.5 9 1 11 0 15c1.5-2 3.25-2.75 5.25-2.25 1.141.285 1.957 1.113 2.86 2.03C9.58 16.271 11.282 18 15 18c4 0 6.5-2 7.5-6-1.5 2-3.25 2.75-5.25 2.25-1.141-.285-1.957-1.113-2.86-2.03C12.92 10.729 11.218 9 7.5 9z"
              />
            </svg>
            <p>
              By the makers of{' '}
              <a
                href="https://tailwindcss.com"
                className="font-medium text-gray-900 hover:text-gray-500 transition-colors duration-150"
              >
                tailwindcss
              </a>
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative rounded-full overflow-hidden">
              <img
                src={require('../img/steve.jpg').default}
                alt=""
                className="bg-gray-200"
                style={{ width: 30, height: 30 }}
                loading="lazy"
              />
              <div className="absolute inset-0 rounded-full border border-black border-opacity-10" />
            </div>
            <p>
              Designed by{' '}
              <a
                href="https://twitter.com/steveschoger"
                className="font-medium text-gray-900 hover:text-gray-500 transition-colors duration-150"
              >
                @steveschoger
              </a>
            </p>
          </div>
        </div>
        <a
          href={SHARE_LINK}
          className="inline-flex items-center space-x-2 text-[#1da1f2] ml-auto font-medium"
        >
          <svg width="20" height="20" fill="currentColor">
            <path d="M6.29 18.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0020 3.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.073 4.073 0 01.8 7.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 010 16.407a11.616 11.616 0 006.29 1.84" />
          </svg>
          <p>Share on Twitter</p>
        </a>
      </div>
    </footer>
  )
}

function Search() {
  const searchInputRef = useRef()
  const [searchQuery, setSearchQuery] = useState('')
  const search = useStore((state) => state.search)

  useEffect(() => {
    setSearchQuery(searchInputRef.current.value)
    function onKeyDown(e) {
      if (
        e.key !== '/' ||
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'SELECT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return
      }
      e.preventDefault()
      searchInputRef.current.focus()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [])

  useEffect(() => {
    const handler = window.setTimeout(() => {
      search(searchQuery)
    }, 100)
    return () => {
      window.clearTimeout(handler)
    }
  }, [searchQuery])

  return (
    <form
      className="group sticky top-0 z-50 bg-white px-4 sm:px-6 lg:px-16 shadow"
      onSubmit={(e) => e.preventDefault()}
    >
      <div className="max-w-10xl mx-auto flex">
        <label htmlFor="search-input" className="flex-none pr-3 flex items-center">
          <span className="sr-only">Search all {iconsMedium.length} icons</span>
          <svg
            width="24"
            height="24"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="text-gray-400 group-focus-within:text-gray-500 transition-colors duration-150"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </label>
        <input
          type="text"
          id="search-input"
          ref={searchInputRef}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={`Search all ${iconsMedium.length} icons (Press “/” to focus)`}
          className="flex-auto py-6 text-base leading-6 text-gray-500 placeholder-gray-500 focus:outline-none focus:placeholder-gray-400"
        />
      </div>
    </form>
  )
}

function IconsContainer() {
  const filter = useStore((state) => state.filter)
  const query = useStore((state) => state.query)

  if (filter && filter.length === 0) {
    return (
      <div className="pt-10 pb-16 sm:pt-24 sm:pb-36 lg:pt-40 lg:pb-56 text-center">
        <svg width="96" height="96" fill="none" className="mx-auto mb-6 text-gray-900">
          <path
            d="M36 28.024A18.05 18.05 0 0025.022 39M59.999 28.024A18.05 18.05 0 0170.975 39"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <ellipse cx="37.5" cy="43.5" rx="4.5" ry="7.5" fill="currentColor" />
          <ellipse cx="58.5" cy="43.5" rx="4.5" ry="7.5" fill="currentColor" />
          <path
            d="M24.673 75.42a9.003 9.003 0 008.879 5.563m-8.88-5.562A8.973 8.973 0 0124 72c0-7.97 9-18 9-18s9 10.03 9 18a9 9 0 01-8.448 8.983m-8.88-5.562C16.919 68.817 12 58.983 12 48c0-19.882 16.118-36 36-36s36 16.118 36 36-16.118 36-36 36a35.877 35.877 0 01-14.448-3.017"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M41.997 71.75A14.94 14.94 0 0148 70.5c2.399 0 4.658.56 6.661 1.556a3 3 0 003.999-4.066 12 12 0 00-10.662-6.49 11.955 11.955 0 00-7.974 3.032c1.11 2.37 1.917 4.876 1.972 7.217z"
            fill="currentColor"
          />
        </svg>
        <p className="text-lg leading-5 font-medium text-gray-900 mb-3">
          Sorry! There are no icons for “{query}”.
        </p>
        <p>
          If you have a request for an icon you can{' '}
          <a
            href={`https://github.com/tailwindlabs/heroicons/issues/new?title=${query}+icon&labels=icon+request`}
            className="text-purple-600 border-b-2 border-purple-100 hover:bg-purple-50 transition-colors duration-150"
          >
            open a new GitHub issue
          </a>
          .
        </p>
      </div>
    )
  }

  return (
    <div
      className="relative grid grid-cols-2 items-start gap-x-8 sm:gap-x-12 lg:gap-x-16 gap-y-4 sm:gap-y-8 max-w-10xl mx-auto pt-6 sm:pt-8 pb-12"
      style={{ gridTemplateRows: 'auto auto' }}
    >
      <section className="contents">
        <header className="col-start-1 row-start-1 flex flex-wrap items-baseline">
          <h2 className="flex-none text-lg leading-6 font-medium text-gray-900 mr-3">Outline</h2>
          <p className="hidden sm:block flex-auto text-gray-400 text-sm leading-5 font-medium">
            2px stroke weight, 24x24 bounding box
          </p>
          <p className="hidden sm:block flex-none w-full text-sm leading-5 mt-3">
            For primary navigation and marketing sections, designed to be rendered at 24x24.
          </p>
        </header>
        <Icons icons={iconsMedium} filter={filter} className="col-start-1 row-start-2" />
      </section>
      <section className="contents">
        <header className="col-start-2 row-start-1 flex flex-wrap items-baseline">
          <h2 className="flex-none text-lg leading-6 font-medium text-gray-900 mr-3">Solid</h2>
          <p className="hidden sm:block flex-auto text-gray-400 text-sm leading-5 font-medium">
            Solid fill, 20x20 bounding box
          </p>
          <p className="hidden sm:block flex-none w-full text-sm leading-5 mt-3">
            For buttons, form elements, and to support text, designed to be rendered at 20x20.
          </p>
        </header>
        <Icons icons={iconsSmall} filter={filter} className="col-start-2 row-start-2" />
      </section>
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-200" />
    </div>
  )
}

export default function Home({ version }) {
  return (
    <>
      <Head>
        <link
          rel="apple-touch-icon"
          sizes="180x180"
          href={require('../img/apple-touch-icon.png').default}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="32x32"
          href={require('../img/favicon-32x32.png').default}
        />
        <link
          rel="icon"
          type="image/png"
          sizes="16x16"
          href={require('../img/favicon-16x16.png').default}
        />
        <meta
          content="Beautiful hand-crafted SVG icons, by the makers of Tailwind CSS."
          name="description"
        />
        <meta property="og:url" content="https://heroicons.com" />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Heroicons" />
        <meta
          property="og:description"
          content="Beautiful hand-crafted SVG icons, by the makers of Tailwind CSS."
        />
        <title>Heroicons</title>
        <meta property="og:title" content="Heroicons" />
        <meta
          property="og:image"
          content={`https://heroicons.com${require('../img/social-card.jpg').default}`}
        />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@tailwindlabs" />
        <meta name="twitter:title" content="Heroicons" />
        <meta
          name="twitter:description"
          content="Beautiful hand-crafted SVG icons, by the makers of Tailwind CSS."
        />
        <meta
          name="twitter:image"
          content={`https://heroicons.com${require('../img/social-card.jpg').default}`}
        />
      </Head>
      <Header version={version} />
      <main className="bg-white">
        <Search />
        <div className="px-4 sm:px-6 lg:px-16">
          <IconsContainer />
        </div>
      </main>
      <Footer />
    </>
  )
}

export function getStaticProps() {
  return { props: { version: require('heroicons/package.json').version } }
}
