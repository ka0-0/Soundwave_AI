import{j as c,g as l,l as t,q as u}from"./index-DliHrjG1.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=c("EyeOff",[["path",{d:"M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49",key:"ct8e1f"}],["path",{d:"M14.084 14.158a3 3 0 0 1-4.242-4.242",key:"151rxh"}],["path",{d:"M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143",key:"13bj9a"}],["path",{d:"m2 2 20 20",key:"1ooewy"}]]);/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=c("Eye",[["path",{d:"M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",key:"1nclc0"}],["circle",{cx:"12",cy:"12",r:"3",key:"1v7zrd"}]]);function f({label:e,type:a="text",error:i,className:n="",...r}){const[s,p]=l.useState(!1),o=a==="password",d=o?s?"text":"password":a;return t.jsxs(u.div,{initial:{opacity:0,y:8},animate:{opacity:1,y:0},className:`space-y-1.5 ${n}`,children:[e&&t.jsx("label",{className:"text-xs font-medium uppercase tracking-wider text-muted",children:e}),t.jsxs("div",{className:"relative group",children:[t.jsx("input",{type:d,className:"input-premium pr-10 focus:ring-2 focus:ring-cyan/30 focus:border-cyan/50 transition-all duration-300",...r}),o&&t.jsx("button",{type:"button",onClick:()=>p(x=>!x),className:"absolute right-3 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-cyan group-focus-within:text-cyan",tabIndex:-1,"aria-label":s?"Hide password":"Show password",children:s?t.jsx(y,{size:18}):t.jsx(m,{size:18})})]}),i&&t.jsx("p",{className:"text-xs text-pink",children:i})]})}export{m as E,f as I};
