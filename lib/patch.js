const render = require('./render')
const updateProps = require('./update-props')
const updateRef = require('./update-ref')

/**
 * 别藏了，你丫就是update，换个马甲我也认识你。。。
 * 刚开始读代码的时候我奇怪这玩意到底是个什么，因为之前也读过别的vnode，对于一个函数大致是什么一般是有数的，还
 * 以为碰到什么黑科技了，仔细看完后这丫不就是update吗
 * @param {*} oldVirtualNode 
 * @param {*} newVirtualNode 
 * @param {*} options 
 */
function patch (oldVirtualNode, newVirtualNode, options) {
  const oldNode = oldVirtualNode.domNode

  if (newVirtualNode === oldVirtualNode) return oldNode

  if (virtualNodesAreEqual(oldVirtualNode, newVirtualNode)) {
    let newNode
    if (newVirtualNode.text != null) {
      oldNode.nodeValue = newVirtualNode.text
      newNode = oldNode
    } else {
      if (typeof newVirtualNode.tag === 'function') {
        newNode = updateComponent(oldVirtualNode, newVirtualNode, options)
      } else {
        updateChildren(oldNode, oldVirtualNode.children, newVirtualNode.children, options)
        updateProps(oldNode, oldVirtualNode, newVirtualNode, options)
        newNode = oldNode
      }
    }
    newVirtualNode.domNode = newNode
    if (newNode !== oldNode && oldNode.parentNode) {
      oldNode.parentNode.replaceChild(newNode, oldNode)
    }
    return newNode
  } else {
    const parentNode = oldNode.parentNode
    const nextSibling = oldNode.nextSibling
    removeVirtualNode(oldVirtualNode, options && options.refs)
    const newNode = render(newVirtualNode, options)
    if (parentNode) parentNode.insertBefore(newNode, nextSibling)
    newVirtualNode.domNode = newNode
    return newNode
  }
}
/**
 * 没什么新奇的东西，还是老一套
 * @param {*} oldVirtualNode 
 * @param {*} newVirtualNode 
 * @param {*} options 
 */
function updateComponent (oldVirtualNode, newVirtualNode, options) {
  const {component, props: oldProps} = oldVirtualNode
  let {props: newProps, children: newChildren} = newVirtualNode
  newVirtualNode.component = component
  const refs = options && options.refs
  if (refs) updateRef(component, oldProps && oldProps.ref, newProps && newProps.ref, refs)
  component.update(newProps || {}, newChildren)
  return component.element
}

let mapPool = [new Map(), new Map(), new Map(), new Map()]

/**
 * 说真的，这丫就是传说中的differ算法啊，还是Vue那一版的，这玩意我手撸过，原理不难，不做笔记了
 * 然而那个mapPool让我十分的莫名其妙，难道Map和对象之间由实质性的区别？回头查一下
 * @param {*} parentElement 
 * @param {*} oldChildren 
 * @param {*} newChildren 
 * @param {*} options 
 */
function updateChildren (parentElement, oldChildren, newChildren, options) {
  var oldStartIndex = 0
  var oldEndIndex = oldChildren.length - 1
  var oldStartChild = oldChildren[0]
  var oldEndChild = oldChildren[oldEndIndex]

  var newStartIndex = 0
  var newEndIndex = newChildren.length - 1
  var newStartChild = newChildren[0]
  var newEndChild = newChildren[newEndIndex]

  var oldIndicesByKey

  while (oldStartIndex <= oldEndIndex && newStartIndex <= newEndIndex) {
    if (!oldStartChild) {
      oldStartChild = oldChildren[++oldStartIndex]
    } else if (!oldEndChild) {
      oldEndChild = oldChildren[--oldEndIndex]
    } else if (virtualNodesAreEqual(oldStartChild, newStartChild)) {
      patch(oldStartChild, newStartChild, options)
      oldStartChild = oldChildren[++oldStartIndex]
      newStartChild = newChildren[++newStartIndex]
    } else if (virtualNodesAreEqual(oldEndChild, newEndChild)) {
      patch(oldEndChild, newEndChild, options)
      oldEndChild = oldChildren[--oldEndIndex]
      newEndChild = newChildren[--newEndIndex]
    } else if (virtualNodesAreEqual(oldStartChild, newEndChild)) {
      patch(oldStartChild, newEndChild, options)
      parentElement.insertBefore(oldStartChild.domNode, oldEndChild.domNode.nextSibling)
      oldStartChild = oldChildren[++oldStartIndex]
      newEndChild = newChildren[--newEndIndex]
    } else if (virtualNodesAreEqual(oldEndChild, newStartChild)) {
      patch(oldEndChild, newStartChild, options)
      parentElement.insertBefore(oldEndChild.domNode, oldStartChild.domNode);
      oldEndChild = oldChildren[--oldEndIndex]
      newStartChild = newChildren[++newStartIndex]
    } else {
      if (!oldIndicesByKey) {
        if (mapPool.length > 0) {
          oldIndicesByKey = mapPool.pop()
          oldIndicesByKey.clear()
        } else {
          oldIndicesByKey = new Map()
        }
        mapOldKeysToIndices(oldIndicesByKey, oldChildren, oldStartIndex, oldEndIndex)
      }

      var key = getKey(newStartChild)
      var oldIndex = key ? oldIndicesByKey.get(key) : null
      if (oldIndex == null) {
        parentElement.insertBefore(render(newStartChild, options), oldStartChild.domNode)
        newStartChild = newChildren[++newStartIndex]
      } else {
        var oldChildToMove = oldChildren[oldIndex]
        patch(oldChildToMove, newStartChild, options)
        oldChildren[oldIndex] = undefined
        parentElement.insertBefore(oldChildToMove.domNode, oldStartChild.domNode)
        newStartChild = newChildren[++newStartIndex]
      }
    }
  }

  if (oldStartIndex > oldEndIndex) {
    var subsequentElement = newChildren[newEndIndex + 1] ? newChildren[newEndIndex + 1].domNode : null
    for (let i = newStartIndex; i <= newEndIndex; i++) {
      parentElement.insertBefore(render(newChildren[i], options), subsequentElement)
    }
  } else if (newStartIndex > newEndIndex) {
    for (let i = oldStartIndex; i <= oldEndIndex; i++) {
      var child = oldChildren[i]
      if (child) removeVirtualNode(child, options && options.refs)
    }
  }

  if (oldIndicesByKey) mapPool.push(oldIndicesByKey)
}

/**
 * 这个对component和普通元素分开处理的思路不错，另外第三个可选参数也很漂亮，避免了重复删除
 * @param {*} virtualNode 
 * @param {*} refs 
 * @param {*} removeDOMNode 
 */
function removeVirtualNode (virtualNode, refs, removeDOMNode = true) {
  const {domNode, props, children, component} = virtualNode
  const ref = props && props.ref
  if (component) {
    if (typeof ref === 'function') ref(null)
    else if (refs && ref && refs[ref] === component) delete refs[ref]
    if (component.destroy) component.destroy()
  } else {
    if (typeof ref === 'function') ref(null)
    else if (refs && ref && refs[ref] === domNode) delete refs[ref]
    if (children) {
      for (let i = 0; i < children.length; i++) {
        removeVirtualNode(children[i], refs, false)
      }
    }
  }

  if (removeDOMNode) domNode.remove()
}

/**
 * 这个函数告诉我们判断两个vnode是否相等只需要看两个参数——key和类型
 * @param {*} oldVirtualNode 
 * @param {*} newVirtualNode 
 */
function virtualNodesAreEqual (oldVirtualNode, newVirtualNode) {
  return (
    getKey(oldVirtualNode) === getKey(newVirtualNode)
      && oldVirtualNode.tag === newVirtualNode.tag
  )
}

/**
 * etch把key放在了props上，而React是是直接放在vnode上的
 * @param {*} virtualNode 
 */
function getKey (virtualNode) {
  return virtualNode.props ? virtualNode.props.key : undefined
}

/**
 * 这个是对旧的children上的元素位置和key做一个对应，方便更新
 * @param {*} oldIndicesByKey 
 * @param {*} children 
 * @param {*} startIndex 
 * @param {*} endIndex 
 */
function mapOldKeysToIndices (oldIndicesByKey, children, startIndex, endIndex) {
  for (let i = startIndex; i <= endIndex; i++) {
    const key = getKey(children[i])
    if (key) oldIndicesByKey.set(key, i)
  }
  return oldIndicesByKey
}

module.exports = patch
