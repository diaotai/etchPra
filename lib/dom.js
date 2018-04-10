const EVENT_LISTENER_PROPS = require('./event-listener-props')
const SVG_TAGS = require('./svg-tags')

/**
 * 本函数作用类似于React.createElement,其实就是babel转码器的入口文件，也就是当babel遇到jsx时候会调用的函数，
 * 其实看到了我们所熟悉的那三个参数，心里基本就有数了
 * @param {*} tag 
 * @param {*} props 
 * @param {*} children 
 */
function dom (tag, props, ...children) {
  let ambiguous = []

  //这里其实就是我之前在bl写的flatternChildren,作用就是对children进行一些处理
  for (let i = 0; i < children.length;) {
    const child = children[i]
    switch (typeof child) {
      case 'string':
      case 'number':
        children[i] = {text: child}
        i++
        break;

      case 'object':
        if (Array.isArray(child)) {
          children.splice(i, 1, ...child)
        } else if (!child) {
          children.splice(i, 1)
        } else {
          if (!child.context) {
            ambiguous.push(child)
            if (child.ambiguous && child.ambiguous.length) {
              ambiguous = ambiguous.concat(child.ambiguous)
            }
          }
          i++
        }
        break;

      default:
        throw new Error(`Invalid child node: ${child}`)
    }
  }

  //对于props进行处理，props包括所有在jsx上的属性
  if (props) {
    for (const propName in props) {
      const eventName = EVENT_LISTENER_PROPS[propName]
      //处理事件挂载
      if (eventName) {
        if (!props.on) props.on = {}
        props.on[eventName] = props[propName]
      }
    }
    //处理css类挂载
    if (props.class) {
      props.className = props.class
    }
  }

  return {tag, props, children, ambiguous}
}

const HTML_TAGS = [
  'a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'bdi', 'bdo',
  'blockquote', 'body', 'button', 'canvas', 'caption', 'cite', 'code',
  'colgroup', 'datalist', 'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl',
  'dt', 'em', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2',
  'h3', 'h4', 'h5', 'h6', 'head', 'header', 'html', 'i', 'iframe', 'ins', 'kbd',
  'label', 'legend', 'li', 'main', 'map', 'mark', 'menu', 'meter', 'nav',
  'noscript', 'object', 'ol', 'optgroup', 'option', 'output', 'p', 'pre',
  'progress', 'q', 'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section',
  'select', 'small', 'span', 'strong', 'style', 'sub', 'summary', 'sup',
  'table', 'tbody', 'td', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title',
  'tr', 'u', 'ul', 'var', 'video', 'area', 'base', 'br', 'col', 'command',
  'embed', 'hr', 'img', 'input', 'keygen', 'link', 'meta', 'param', 'source',
  'track', 'wbr'
]

for (const tagName of HTML_TAGS) {
  dom[tagName] = (props, ...children) => {
    return dom(tagName, props, ...children)
  }
}

for (const tagName of SVG_TAGS) {
  dom[tagName] = (props, ...children) => {
    return dom(tagName, props, ...children)
  }
}


module.exports = dom
