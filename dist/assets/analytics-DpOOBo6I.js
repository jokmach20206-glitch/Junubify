import{c as s,s as a}from"./supabase-3BK9fLf-.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=s("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]),n="junubify-analytics-region",o="junubify-analytics-enabled",c=new Set(["south_sudan","east_africa","africa_other","europe","north_america","other"]);function i(){try{return localStorage.getItem(o)!=="false"}catch{return!1}}function l(){try{const t=localStorage.getItem(n);return c.has(t)?t:null}catch{return null}}function f(t){try{t?c.has(t)&&localStorage.setItem(n,t):localStorage.removeItem(n)}catch{}}async function _(t,e=null){if(!(!a||!i()||!["play","like","search"].includes(t)))try{await a.rpc("record_analytics_event",{p_event_name:t,p_track_id:e,p_region_code:l()})}catch{}}async function h(t=30){if(!a)throw new Error("Connect Supabase to view analytics.");const{data:e,error:r}=await a.rpc("get_analytics_dashboard",{p_days:t});if(r)throw r;return e}export{y as A,h as f,l as g,i,_ as r,f as s};
