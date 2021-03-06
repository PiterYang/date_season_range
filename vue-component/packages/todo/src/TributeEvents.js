import { addDays, addHours } from "./utils";
class TributeEvents {
  constructor(tribute) {
    this.tribute = tribute;
    this.tribute.events = this;
    this.keyCodeStack = [];
  }

  static keys() {
    return [
      {
        key: 9,
        value: "TAB"
      },
      {
        key: 8,
        value: "DELETE"
      },
      {
        key: 13,
        value: "ENTER"
      },
      {
        key: 27,
        value: "ESCAPE"
      },
      {
        key: 32,
        value: "SPACE"
      },
      {
        key: 38,
        value: "UP"
      },
      {
        key: 40,
        value: "DOWN"
      }
    ];
  }

  bind(element) {
    element.boundKeydown = this.keydown.bind(element, this);
    element.boundKeyup = this.keyup.bind(element, this);
    element.boundInput = this.input.bind(element, this);
    element.boundClick = this.elementClick.bind(element, this);
    element.boundPaste = this.paste.bind(element, this);
    element.addEventListener("keydown", element.boundKeydown, true);
    element.addEventListener("keyup", element.boundKeyup, true);
    element.addEventListener("input", element.boundInput, true);
    element.addEventListener("click", element.boundClick, true);
    element.addEventListener("paste", element.boundPaste, true);
  }

  unbind(element) {
    element.removeEventListener("keydown", element.boundKeydown, true);
    element.removeEventListener("keyup", element.boundKeyup, true);
    element.removeEventListener("input", element.boundInput, true);
    element.removeEventListener("click", element.boundClick, true);
    element.removeEventListener("paste", element.boundPaste, true);
    delete element.boundKeydown;
    delete element.boundKeyup;
    delete element.boundInput;
    delete element.boundClick;
    delete element.boundPaste;
  }

  keydown(instance, event) {
    if (instance.shouldDeactivate(event)) {
      instance.tribute.isActive = false;
      instance.tribute.hideMenu();
    }

    let element = this;
    instance.commandEvent = false;
    if (event.keyCode === 39 || event.keyCode === 37) {
      instance.commandEvent = true;
    }
    TributeEvents.keys().forEach(o => {
      if (o.key === event.keyCode) {
        if (o.key !== 8) {
          instance.commandEvent = true;
        }

        instance.callbacks()[o.value.toLowerCase()](event, element);
      }
    });
  }
  paste(instance, e) {
    e.preventDefault();
    var text = null;
    let html = null;
    if (window.clipboardData && window.clipboardData.setData) {
      // IE
      text = window.clipboardData.getData("text");
      html = window.clipboardData.getData("text/html");
    } else {
      text = (e.originalEvent || e).clipboardData.getData("text/plain") || "";
      html = (e.originalEvent || e).clipboardData.getData("text/html") || "";
    }
    if (document.body.createTextRange) {
      let textRange;
      if (document.selection) {
        textRange = document.selection.createRange();
      } else if (window.getSelection) {
        let sel = window.getSelection();
        var range = sel.getRangeAt(0);

        // 创建临时元素，使得TextRange可以移动到正确的位置
        var tempEl = document.createElement("span");
        tempEl.innerHTML = "&#FEFF;";
        range.deleteContents();
        range.insertNode(tempEl);
        textRange = document.body.createTextRange();
        textRange.moveToElementText(tempEl);
        tempEl.parentNode.removeChild(tempEl);
      }
      textRange.text = text;
      textRange.collapse(false);
      textRange.select();
    } else {
      // Chrome之类浏览器
      if (!html.includes("fg-todo")) {
        document.execCommand("insertText", false, text);
      } else {
        let el = document.createElement("div");
        el.innerHTML = html.replace(/<br[^>]+>/g, "");
        let frag = document.createDocumentFragment(),
          node;
        while ((node = el.firstChild)) {
          if (node.classList.length) {
            frag.appendChild(node);
          } else {
            let textNode = document.createTextNode(node.innerText);
            el.removeChild(node);
            frag.appendChild(textNode);
          }
        }

        e.target.appendChild(frag);
        instance.tribute.placeCaretAtEnd(e.target);
      }

      // document.execCommand("insertText", false, text);
    }
  }

  input(instance, event) {
    instance.inputEvent = true;
    instance.keyup.call(this, instance, event);
  }
  click(instance, event) {
    let tribute = instance.tribute;
    if (tribute.menu && tribute.menu.contains(event.target)) {
      if (tribute.current.collection.trigger !== "//") {
        let li = event.target;
        event.preventDefault();
        event.stopPropagation();
        while (li.nodeName.toLowerCase() !== "li") {
          li = li.parentNode;
          if (!li || li === tribute.menu) {
            throw new Error("cannot find the <li> container for the click");
          }
        }
        tribute.selectItemAtIndex(li.getAttribute("data-index"), event);
        tribute.hideMenu();
      } else {
        // event.preventDefault();
        // event.stopPropagation();
        // return;
        // tribute.selectItemAtIndex("date", event);
        // if (event.target.tagName !== "input") {
        //   tribute.anchorNode = tribute.range.getWindowSelection().anchorNode;
        // }
      }

      // TODO: should fire with externalTrigger and target is outside of menu
    } else if (tribute.current.element && !tribute.current.externalTrigger) {
      tribute.current.externalTrigger = false;
      setTimeout(() => tribute.hideMenu());
    }
  }

  elementClick(instance, event) {
    instance.tribute.vue.getLastActiveTodo(event);
  }
  isFocusOnElement() {
    return this.tribute.range.getWindowSelection().focusNode.nodeType === 1;
  }
  keyup(instance, event) {
    if (event.target.innerHTML.includes("<br>")) {
      const children = event.target.children;
      const br = children[children.length - 1];
      const br2 = children[children.length - 2];
      let prev;
      if (br2 && br2.tagName === "BR") {
        event.target.removeChild(br2);
        prev = children[children.length - 3];
      } else {
        prev = children[children.length - 2];
      }
      if (br) {
        event.target.removeChild(br);
      }

      if (prev) {
        event.target.removeChild(prev);
      }
    }
    if (instance.inputEvent) {
      instance.inputEvent = false;
    }
    instance.updateSelection(this, event.keyCode);
    if (event.keyCode === 27) return;

    if (!instance.tribute.allowSpaces && instance.tribute.hasTrailingSpace) {
      instance.tribute.hasTrailingSpace = false;
      instance.commandEvent = true;
      instance.callbacks()["space"](event, this);
      return;
    }

    if (!instance.tribute.isActive) {
      if (instance.tribute.autocompleteMode) {
        instance.callbacks().triggerChar(event, this, "");
      } else {
        let keyCode = instance.getKeyCode(instance, this, event);
        // return;
        if (instance.keyCodeStack.length == 2) {
          instance.keyCodeStack.push(keyCode);
          instance.keyCodeStack.shift();
        } else {
          instance.keyCodeStack.push(keyCode);
        }
        if (isNaN(keyCode) || !keyCode) return;
        let trigger = instance.tribute.triggers().find(trigger1 => {
          let total = trigger1.split("").reduce((accu, cru) => {
            return (accu += cru.charCodeAt(0) ? cru.charCodeAt(0) : 0);
          }, 0);
          return total === keyCode;
        });
        if (typeof trigger !== "undefined") {
          instance.callbacks().triggerChar(event, this, trigger);
        }
      }
    }
    if (
      instance.tribute.current.mentionText.length <
      instance.tribute.current.collection.menuShowMinLength
    ) {
      return;
    }

    if (
      ((instance.tribute.current.trigger ||
        instance.tribute.autocompleteMode) &&
        (instance.commandEvent === false && !instance.isFocusOnElement())) ||
      (instance.tribute.isActive && event.keyCode === 8)
    ) {
      if (event.target.tagName !== "input") {
        const selection = instance.tribute.range.getWindowSelection();
        instance.tribute.anchorNode = {
          offset: selection.getRangeAt(0).startOffset,
          text: selection.anchorNode
        };
      }
      instance.tribute.showMenuFor(this, true);
    }
  }

  shouldDeactivate(event) {
    if (!this.tribute.isActive) return false;

    if (this.tribute.current.mentionText.length === 0) {
      let eventKeyPressed = false;
      TributeEvents.keys().forEach(o => {
        if (event.keyCode === o.key) eventKeyPressed = true;
      });

      return !eventKeyPressed;
    }

    return false;
  }

  getKeyCode(instance, el, event) {
    let char;
    let tribute = instance.tribute;
    let info = tribute.range.getTriggerInfo(
      false,
      tribute.hasTrailingSpace,
      true,
      tribute.allowSpaces,
      tribute.autocompleteMode
    );
    if (info) {
      let total = info.mentionTriggerChar.split("").reduce((accu, cru) => {
        return (accu += cru.charCodeAt(0) ? cru.charCodeAt(0) : 0);
      }, 0);
      return total;
      // return info.mentionTriggerChar.charCodeAt(0);
    } else {
      return false;
    }
  }

  updateSelection(el, keyCode) {
    this.tribute.current.element = el;
    let info = this.tribute.range.getTriggerInfo(
      false,
      this.tribute.hasTrailingSpace,
      true,
      this.tribute.allowSpaces,
      this.tribute.autocompleteMode
    );
    if (info) {
      this.tribute.current.selectedPath = info.mentionSelectedPath;
      this.tribute.current.mentionText = info.mentionText;
      this.tribute.current.selectedOffset = info.mentionSelectedOffset;
    }
  }
  pattern(fmt, date) {
    /** * 对Date的扩展，将 Date 转化为指定格式的String * 月(M)、日(d)、12小时(h)、24小时(H)、分(m)、秒(s)、周(E)、季度(q)
    可以用 1-2 个占位符 * 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字) * eg: * (new
    Date()).pattern("yyyy-MM-dd hh:mm:ss.S")==> 2006-07-02 08:09:04.423
    * (new Date()).pattern("yyyy-MM-dd E HH:mm:ss") ==> 2009-03-10 二 20:09:04
    * (new Date()).pattern("yyyy-MM-dd EE hh:mm:ss") ==> 2009-03-10 周二 08:09:04
    * (new Date()).pattern("yyyy-MM-dd EEE hh:mm:ss") ==> 2009-03-10 星期二 08:09:04
    * (new Date()).pattern("yyyy-M-d h:m:s.S") ==> 2006-7-2 8:9:4.18
    */

    let o = {
      "M+": date.getMonth() + 1, //月份
      "d+": date.getDate(), //日
      "h+": date.getHours() % 12 == 0 ? 12 : date.getHours() % 12, //小时
      "H+": date.getHours(), //小时
      "m+": date.getMinutes(), //分
      "s+": date.getSeconds(), //秒
      "q+": Math.floor((date.getMonth() + 3) / 3), //季度
      S: date.getMilliseconds() //毫秒
    };
    let week = {
      "0": "/u65e5",
      "1": "/u4e00",
      "2": "/u4e8c",
      "3": "/u4e09",
      "4": "/u56db",
      "5": "/u4e94",
      "6": "/u516d"
    };
    if (/(y+)/.test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        (date.getFullYear() + "").substr(4 - RegExp.$1.length)
      );
    }
    if (/(E+)/.test(fmt)) {
      fmt = fmt.replace(
        RegExp.$1,
        (RegExp.$1.length > 1
          ? RegExp.$1.length > 2
            ? "/u661f/u671f"
            : "/u5468"
          : "") + week[date.getDay() + ""]
      );
    }
    for (let k in o) {
      if (new RegExp("(" + k + ")").test(fmt)) {
        fmt = fmt.replace(
          RegExp.$1,
          RegExp.$1.length == 1
            ? o[k]
            : ("00" + o[k]).substr(("" + o[k]).length)
        );
      }
    }
    return fmt;
  }
  callbacks() {
    return {
      triggerChar: (e, el, trigger) => {
        let tribute = this.tribute;
        tribute.current.trigger = trigger;

        let collectionItem = tribute.collection.find(item => {
          return item.trigger === trigger;
        });

        tribute.current.collection = collectionItem;

        if (
          tribute.current.mentionText.length >=
            tribute.current.collection.menuShowMinLength &&
          tribute.inputEvent
        ) {
          tribute.showMenuFor(el, true);
        }
      },
      enter: (e, el) => {
        // choose selection

        if (this.tribute.isActive && this.tribute.current.filteredItems) {
          e.preventDefault();
          e.stopPropagation();
          setTimeout(() => {
            if (this.tribute.current.collection.trigger === "//") {
              this.tribute.selectItemAtIndex(
                "date",
                "event",
                this.pattern("yyyy-MM-dd HH:mm:ss", addHours(19, addDays(1))),
                "customSelection"
              );
            } else {
              this.tribute.selectItemAtIndex(this.tribute.menuSelected, e);
            }

            this.tribute.hideMenu();
          }, 0);
        } else {
          e.preventDefault();
          // e.stopPropagation();
          this.tribute.vue.addTodo();
        }
      },
      escape: (e, el) => {
        if (this.tribute.isActive) {
          e.preventDefault();
          e.stopPropagation();
          this.tribute.isActive = false;
          this.tribute.hideMenu();
        }
      },
      tab: (e, el) => {
        // choose first match
        this.callbacks().enter(e, el);
      },
      space: (e, el) => {
        if (this.tribute.isActive) {
          if (this.tribute.spaceSelectsMatch) {
            this.callbacks().enter(e, el);
          } else if (!this.tribute.allowSpaces) {
            e.stopPropagation();
            setTimeout(() => {
              this.tribute.hideMenu();
              this.tribute.isActive = false;
            }, 0);
          }
        }
      },
      up: (e, el) => {
        // navigate up ul
        if (this.tribute.isActive && this.tribute.current.filteredItems) {
          e.preventDefault();
          e.stopPropagation();
          let count = this.tribute.current.filteredItems.length,
            selected = this.tribute.menuSelected;

          if (count > selected && selected > 0) {
            this.tribute.menuSelected--;
            this.setActiveLi();
          } else if (selected === 0) {
            this.tribute.menuSelected = count - 1;
            this.setActiveLi();
            this.tribute.menu.scrollTop = this.tribute.menu.scrollHeight;
          }
        }
      },
      down: (e, el) => {
        // navigate down ul
        if (this.tribute.isActive && this.tribute.current.filteredItems) {
          e.preventDefault();
          e.stopPropagation();
          let count = this.tribute.current.filteredItems.length - 1,
            selected = this.tribute.menuSelected;

          if (count > selected) {
            this.tribute.menuSelected++;
            this.setActiveLi();
          } else if (count === selected) {
            this.tribute.menuSelected = 0;
            this.setActiveLi();
            this.tribute.menu.scrollTop = 0;
          }
        }
      },
      delete: (e, el) => {
        if (
          this.tribute.isActive &&
          this.tribute.current.mentionText.length < 1
        ) {
          this.tribute.hideMenu();
        } else if (this.tribute.isActive) {
          this.tribute.showMenuFor(el);
        }
        // 解决只有一个元素无法删除问题
        // if (el.innerHTML.includes("<br>")) {
        // const br = el.lastChild;
        // const prev = el.previousSibling;
        // el.innerHTML = el.innerHTML.replace(
        //   /^<[^>]+>(.*?)<\/[^>]+><br>$/g,
        //   ""
        // );
        // this.tribute.placeCaretAtEnd(el);
        // }
        if (
          el.children.length === 1 &&
          !el.innerHTML.replace(/<[^>]+>(.*?)<\/[^>]+>/g, "")
        ) {
          el.innerHTML = "";
          return;
        }
        if (el.innerHTML === "") {
          this.tribute.vue.deleteTodo(el.getAttribute("id"));
        }
      }
    };
  }

  setActiveLi(index) {
    let lis = this.tribute.menu.querySelectorAll("li"),
      length = lis.length >>> 0;

    if (index) this.tribute.menuSelected = parseInt(index);

    for (let i = 0; i < length; i++) {
      let li = lis[i];
      if (i === this.tribute.menuSelected) {
        li.classList.add(this.tribute.current.collection.selectClass);

        let liClientRect = li.getBoundingClientRect();
        let menuClientRect = this.tribute.menu.getBoundingClientRect();

        if (liClientRect.bottom > menuClientRect.bottom) {
          let scrollDistance = liClientRect.bottom - menuClientRect.bottom;
          this.tribute.menu.scrollTop += scrollDistance;
        } else if (liClientRect.top < menuClientRect.top) {
          let scrollDistance = menuClientRect.top - liClientRect.top;
          this.tribute.menu.scrollTop -= scrollDistance;
        }
      } else {
        li.classList.remove(this.tribute.current.collection.selectClass);
      }
    }
  }

  getFullHeight(elem, includeMargin) {
    let height = elem.getBoundingClientRect().height;

    if (includeMargin) {
      let style = elem.currentStyle || window.getComputedStyle(elem);
      return (
        height + parseFloat(style.marginTop) + parseFloat(style.marginBottom)
      );
    }

    return height;
  }
}

export default TributeEvents;
