# etchPra
### 概述
本项目是我在学习etch项目源码过程中的实践，因为我碰到了一些问题在阅读源码中想不明白，所以决定自己魔改一番，配置好环境来跑一跑，现在基本搞清楚了情况。

### 怎样运行
因为我已经配置好了环境，所以clone好项目后，npm  install，然后npm run start 就好，。

* * *
### 本项目目标
原本只是在写自己的bl框架时遇到瓶颈所以到etch那边取取经，没想到越看越有意思，因此我决定在etch代码中补上自己的理解，以及把etch运行的流程写出来。大神就不用看了，我这个相当于自己的学习笔记，另外给跟我差不多的萌新看的。
etch的代码在lib里面

***

***
### 项目流程
我认为我已经理清楚整个项目的流程了，尝试性的写一写。
为了保证思路清晰，我只说核心部分，具体的细节可以看我代码上的注释。

首先，一切从component-helpers文件的initialize函数开始，这个函数负责以一个component实例为参数（具体表现形式为在一个component的constructor中调用，参数为this。这样就保证了当一个组件被实例化的时候必然会调用initialize然后完成必要的初始化）。接下来我们深入initialize函数，看看它干了什么。

initialize干的非常简单，调用component实例的render函数返回jsx转成的virtualNode，然后调用render将virtualNode转化为DOM元素，最后将virtualNode和DOM元素都挂载在component上。在我们写的代码里，我们会手动将DOM元素挂载到dom树上。

接下来我们分两条线看，一条是jsx如何如何变成virtualNode。很简单，babel转码器，react就是用的这个。然而transform-react-jsx插件的默认入口是React.createElement，这里需要我们配置一下，将其改成etch.dom。（入口的意思是jsx转码后的东西应该传到哪里）。dom文件下的dom函数所做的就是将传入的参数进行处理，然后返回一个货真价实的virtualNode。到此，我们应该明白了，当我们碰到一个jsx时候，我们实际收到的是一个经过dom函数处理过的virtualNode（没错，我说的就是每个component的render返回的东西，另外所谓virtualNode说到底就是一个拥有特定属性的对象）。

接下来我们看另一条线，那就是render如何将virtualNode转化为一个真正的DOM元素。

其实很简单，通过对virtualNode的tag进行判断，我们可以轻易的判断virtualNode是什么类型的（比如组件，比如基本元素，比如字符元素），然后针对不同的类型进行处理（基本的好说），组件的话，要再走一遍组件的创建和挂载流程。若为基础元素，则我们可以将对应的属性放到DOM元素上，最后返回创建好的DOM元素（其实virtualNode上的所有元素基本最后都是要反映到基础DOM元素上的，可能是属性，可能是子元素）。

到这里，我们已经完成了DOM元素挂载的全过程，接下来我们看一看更新的时候会发生什么。

更新的话，我们会在自己写的update函数中调用component-helpers的update函数（后面我们叫它etch.update），而etch.update和initialize一样会以component实例作为参数，具体来说就是组件class中的this。然后在etch.update中会以异步的形式来进行更新，这样可以保证避免更新冗余，极大的提升性能（至于为什么，去看代码我写的笔记，这里不表）。但是etch.update真正进行更新的部分却是在etch.updateSync。看函数名我们就知道这是这是一个更新的同步版。这个函数会让component实时更新，而etch.update实际上是以异步的形式调用的这个同步版。

接下来我们深入etch.updateSync来看看它到底是怎么做的。

其实很简单，由于scheduler的骚操作，在调用updateSync之前实质性的更新已经全部调用，然后我们要做的就是调用component.render获取新的virtualNode,然后通过patch函数根据新旧virtualNode判断哪些部分需要更新，然后对DOM进行更新，最后处理生命周期函数，完美。

那么scheduler的骚操作到底是什么呢？其实就是靠requestAnimationFrame保证所有的更新都在同一帧内解决。另外通过weakSet机制，可以保证一个组件在它完成自己的实质性更新之前绝不会再重绘（这里是说数据会更新，但不会反映到实际的DOM元素上，这就很完美的做到了避免冗余的更新）

最后我们看一看组件的卸载和销毁部分。这部分应该是destroy负责的，我们要在组件的destory方法中调用etch.destory。要说一下，etch.destory和etch.update一样是异步函数.然后我们可以根据update很轻松的猜出一定含有一个同步版的destroySync。没错，就是这样，真正的卸载是在destroySync中完成的。逻辑也很简单，组件上的destory会被调用，它的子组件上具有destory的也会被调用，这样一直递归。最后从DOM树上删除掉component对应的DOM元素。

到这里我们就走完全部流程了。这就是一套etch virtualNode，很简单，很有趣，很巧妙。



### 写在最后
个人觉得etch针对是一个非常好的学习内容，实际代码才七百来行，逻辑极度清晰，很适合作为想了解vdom的人的入门项目。
[原项目链接](https://github.com/atom/etch)
