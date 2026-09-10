import {expect,test} from 'bun:test';
import {action_button} from '../src/ui.js';

class Node {
  constructor(tagName, namespaceURI='http://www.w3.org/1999/xhtml') {
    this.tagName = tagName;
    this.namespaceURI = namespaceURI;
    this.children = [];
    this.attributes = new Map();
    this.style = {};
    this.className = '';
  }
  append(...nodes) { this.children.push(...nodes); }
  setAttribute(name, value) {
    this.attributes.set(name, String(value));
    if (name === 'class') this.className = String(value);
  }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  get firstElementChild() { return this.children[0] || null; }
  remove() {}
}

const document = {
  createElement:tag => new Node(tag),
  createElementNS:(namespace, tag) => new Node(tag, namespace),
};

test('an explicit icon color survives a borrowed content class', () => {
  const view = action_button(document, {
    label:'Copy', icon:'link',
    appearance:{buttonClass:'native-button', contentClass:'native-content', iconColor:'rgb(113, 118, 123)'},
  });
  const svg = view.element.firstElementChild.firstElementChild;
  expect(svg.style.color).toBe('rgb(113, 118, 123)');
  view.appearance({iconColor:'rgb(231, 233, 234)'});
  expect(svg.style.color).toBe('rgb(231, 233, 234)');
});
