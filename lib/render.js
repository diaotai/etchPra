const updateProps = require('./update-props')
const SVG_TAGS = require('./svg-tags')

/**
 * 该函数用于将virtualNode变成实质性的dom元素，比较让我赞叹的是用update函数来进行初始化，我当时怎么就没想到
 * @param {*} virtualNode 
 * @param {*} options 
 */
function render (virtualNode, options) {
  let domNode
  if (virtualNode.text != null) {
    domNode = document.createTextNode(virtualNode.text)
  } else {
    const {tag, children} = virtualNode
    let {props, context} = virtualNode

    if (context) {
      options = {refs: context.refs, listenerContext: context}
    }

    if (typeof tag === 'function') {
      let ref
      if (props && props.ref) {
        ref = props.ref
      }
      const component = new tag(props || {}, children)
      virtualNode.component = component
      domNode = component.element
     // console.log(domNode,"!!!",virtualNode)
      if (typeof ref === "function") {
        ref(component)
      } else if (options && options.refs && ref) {
        options.refs[ref] = component
      }
    } else if (SVG_TAGS.has(tag)) {
      domNode = document.createElementNS("http://www.w3.org/2000/svg", tag);
      if (children) addChildren(domNode, children, options)
      if (props) updateProps(domNode, null, virtualNode, options)
    } else {
      domNode = document.createElement(tag)
      if (children) addChildren(domNode, children, options)
      if (props) updateProps(domNode, null, virtualNode, options)
    }
  }
  virtualNode.domNode = domNode
  return domNode
}

function addChildren (parent, children, options) {
  for (let i = 0; i < children.length; i++) {
    parent.appendChild(render(children[i], options))
  }
}

module.exports = render
