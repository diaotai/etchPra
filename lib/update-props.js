const EVENT_LISTENER_PROPS = require('./event-listener-props')
const SVG_TAGS = require('./svg-tags')
const SVG_ATTRIBUTE_TRANSLATIONS = require('./svg-attribute-translations')
const EMPTY = ''

const updateRef = require('./update-ref')

/**
 * 本函数就是究极的更新了，更新普通props，更新ref，还更新事件监听器。不过要注意，这是对单个元素的更新，而不涉及
 * 对子元素的更新，所以这家伙其实不应该叫update的
 * @param {*} domNode 
 * @param {*} oldVirtualNode 
 * @param {*} newVirtualNode 
 * @param {*} options 
 */
module.exports = function (domNode, oldVirtualNode, newVirtualNode, options) {
  const oldProps = oldVirtualNode && oldVirtualNode.props
  const newProps = newVirtualNode.props

  let refs, listenerContext
  if (options) {
    refs = options.refs
    listenerContext = options.listenerContext
  }
  updateProps(domNode, oldVirtualNode, oldProps, newVirtualNode, newProps)
  if (refs) updateRef(domNode, oldProps && oldProps.ref, newProps && newProps.ref, refs)
  updateEventListeners(domNode, oldVirtualNode, newVirtualNode, listenerContext)
}


/**
 * 本函数用于处理对除了Ref和listeners的更新，还是老传统，删旧的加新的。在第一个循环中，对dataset和svg进行了处
 * 理，另外删除上轨属性。
 * 该函数的亮点主要在于对于style和className的删除上——先置为空字符串在删除。此外对于input的value处理也很有意思，
 * 大致是对于value的任何处理都会导致光标的重置
 * @param {*} domNode 
 * @param {*} oldVirtualNode 
 * @param {*} oldProps 
 * @param {*} newVirtualNode 
 * @param {*} newProps 
 */
// Using var to avoid "Unsupported phi use of variable" deoptimization in Chrome 56
function updateProps (domNode, oldVirtualNode, oldProps, newVirtualNode, newProps) {
  if (oldProps) {
    for (var name in oldProps) {
      if (name === 'ref' || name === 'on') continue
      if (name in EVENT_LISTENER_PROPS) continue
      if (!newProps || !(name in newProps)) {
        if (name === 'dataset') {
          updateProps(domNode.dataset, null, oldProps && oldProps.dataset, null, null)
        } else if (name !== 'innerHTML' && oldVirtualNode && SVG_TAGS.has(oldVirtualNode.tag)) {
          domNode.removeAttribute(SVG_ATTRIBUTE_TRANSLATIONS.get(name) || name)
        } else {
          // Clear property for objects that don't support deletion (e.g. style
          // or className). If we used null instead of an empty string, the DOM
          // could sometimes stringify the value and mistakenly assign 'null'.
          domNode[name] = EMPTY
          delete domNode[name]
        }
      }
    }
  }

  if (newProps) {
    for (var name in newProps) {
      if (name === 'ref' || name === 'on') continue
      if (name in EVENT_LISTENER_PROPS) continue
      var oldValue = oldProps && oldProps[name]
      var newValue = newProps[name]
      if (name === 'dataset') {
        updateNestedProps(domNode.dataset, oldValue, newValue, false)
      } else if (name === 'style' && typeof newValue !== 'string') {
        if (typeof oldValue === 'string') {
          domNode.style = ''
          oldValue = null
        }
        updateNestedProps(domNode.style, oldValue, newValue, true)
      } else if (name === 'attributes') {
        updateAttributes(domNode, oldValue, newValue)
      } else {
        if (newValue !== oldValue) {
          if (name !== 'innerHTML' && newVirtualNode && SVG_TAGS.has(newVirtualNode.tag)) {
            domNode.setAttribute(SVG_ATTRIBUTE_TRANSLATIONS.get(name) || name, newValue)
          } else if (newVirtualNode && newVirtualNode.tag === 'input'
            && name === 'value' && domNode[name] === newValue) {
            // Do not update `value` of an `input` unless it differs.
            // Every change will reset the cursor position.
          } else {
            domNode[name] = newValue
          }
        }
      }
    }
  }
}

/**
 * 这个函数用于对常规属性进行更新，其主要的亮点在于对消失的css属性的处理
 * @param {*} domProps 
 * @param {*} oldProps 
 * @param {*} newProps 
 * @param {*} isStyleObject 
 */
function updateNestedProps (domProps, oldProps, newProps, isStyleObject) {
  if (oldProps) {
    for (var name in oldProps) {
      if (!newProps || !(name in newProps)) {
        if (isStyleObject) {
          domProps[name] = EMPTY
        } else {
          delete domProps[name]
        }
      }
    }
  }

  if (newProps) {
    for (var name in newProps) {
      const oldValue = oldProps && oldProps[name]
      const newValue = newProps[name]
      if (newValue !== oldValue) {
        domProps[name] = newValue
      }
    }
  }
}

/**
 * 更新attributes，其实还是删旧的加新的
 * @param {*} domNode 
 * @param {*} oldAttributes 
 * @param {*} newAttributes 
 */
function updateAttributes (domNode, oldAttributes, newAttributes) {
  if (oldAttributes) {
    for (var name in oldAttributes) {
      if (!newAttributes || !(name in newAttributes)) {
        domNode.removeAttribute(name)
      }
    }
  }

  if (newAttributes) {
    for (var name in newAttributes) {
      const oldValue = oldAttributes && oldAttributes[name]
      const newValue = newAttributes[name]
      if (newValue !== oldValue) {
        domNode.setAttribute(name, newValue)
      }
    }
  }
}

/**
 * 本函数用于对事件监听器的更新，处理流程很简单，先处理所有在旧状态上存在的监听器而在新状态下不存在的监听器（就是
 * 第一个循环了）。另外boundListeners和正常的listeners之间的区别就在于boundListeners绑定了上下文。在第二个循
 * 环中，该函数对新的listeners进行循环，并在旧listeners上取相同的键值来判断新旧是否相等，若相等，则跳过。若不
 * 相等，则删掉旧的，加上新的。但是显然，这种机制只允许同一个组件上对某个特定的事件只能挂载一个回掉函数。这个是
 * 要解决的。
 * @param {*} domNode 
 * @param {*} oldVirtualNode 
 * @param {*} newVirtualNode 
 * @param {*} listenerContext 
 */
function updateEventListeners (domNode, oldVirtualNode, newVirtualNode, listenerContext) {
  const oldListeners = oldVirtualNode && oldVirtualNode.props && oldVirtualNode.props.on
  const newListeners = newVirtualNode.props && newVirtualNode.props.on

  for (const eventName in oldListeners) {
    if (!(newListeners && eventName in newListeners)) {
      let listenerToRemove
      if (oldVirtualNode && oldVirtualNode.boundListeners && oldVirtualNode.boundListeners[eventName]) {
        listenerToRemove = oldVirtualNode.boundListeners[eventName]
      } else {
        listenerToRemove = oldListeners[eventName]
      }
      domNode.removeEventListener(eventName, listenerToRemove)
    }
  }

  for (const eventName in newListeners) {
    const oldListener = oldListeners && oldListeners[eventName]
    const newListener = newListeners[eventName]

    if (newListener !== oldListener) {
      if (oldListener) {
        let listenerToRemove
        if (oldVirtualNode && oldVirtualNode.boundListeners && oldVirtualNode.boundListeners[eventName]) {
          listenerToRemove = oldVirtualNode.boundListeners[eventName]
        } else {
          listenerToRemove = oldListener
        }
        domNode.removeEventListener(eventName, listenerToRemove)
      }
      if (newListener) {
        let listenerToAdd
        if (listenerContext) {
          listenerToAdd = newListener.bind(listenerContext)
          if (!newVirtualNode.boundListeners) newVirtualNode.boundListeners = {}
          newVirtualNode.boundListeners[eventName] = listenerToAdd
        } else {
          listenerToAdd = newListener
        }
        domNode.addEventListener(eventName, listenerToAdd)
      }
    }
  }
}
