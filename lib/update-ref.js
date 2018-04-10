/**
 * 其实如果了解ref的效果，本函数还是比较好懂的。首先比较挂载的新旧ref名是否有变化（如果没变化自然没有更新
 * 的必要了）。若存在变化，则先处理旧的ref。ref在使用时可以是函数或者字符串，若为函数，则在挂载时候调用，参
 * 数为dom节点，卸载时还会调用函数，参数为null。若为字符串的话就是将dom节点挂载到refs对象上
 * 该函数非常巧妙的一点是没有古板的处理那四种情况（新旧都没有，新旧都有，新有旧没有，新没有旧有），而是韩简洁
 * 的将情况分为新旧相等或不等。这样的话我们只需要对旧的进行处理（卸载或删除），对新的进行挂载即可。
 * @param {*} domNode 
 * @param {*} oldRefName 
 * @param {*} newRefName 
 * @param {*} refs 
 */
module.exports = function updateRef (domNode, oldRefName, newRefName, refs) {
  if (newRefName !== oldRefName) {
    if (typeof oldRefName === 'function') oldRefName(null)
    else if (oldRefName && refs[oldRefName] === domNode) delete refs[oldRefName]
    if (typeof newRefName === 'function') newRefName(domNode)
    else if (newRefName) refs[newRefName] = domNode
  }
}
