import "babel-polyfill";
import MyComponent from "./mycomponent";
// build a component instance in a standard way...
let component = new MyComponent({foo: 1, bar: 2})
console.log("component",component)
// setTimeout(()=>{
//   component.update({foo:999})
// },5000)

// // use the component's associated DOM element however you wish...
// document.body.appendChild(component.element)

// update the component as needed...
// await component.update({bar: 2})

// // destroy the component when done...
// await component.destroy()