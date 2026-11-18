import{c as o,s as a}from"./supabase-C9ShQnwr.js";/**
 * @license lucide-react v0.468.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const l=o("ArrowLeft",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]),r="junubify-analytics-region",c=new Set(["south_sudan","east_africa","africa_other","europe","north_america","other"]);function s(){try{const t=localStorage.getItem(r);return c.has(t)?t:null}catch{return null}}function u(t){try{t?c.has(t)&&localStorage.setItem(r,t):localStorage.removeItem(r)}catch{}}async function y(t,e=null){if(!(!a||!["play","like","search"].includes(t)))try{await a.rpc("record_analytics_event",{p_event_name:t,p_track_id:e,p_region_code:s()})}catch{}}async function _(t=30){if(!a)throw new Error("Connect Supabase to view analytics.");const{data:e,error:n}=await a.rpc("get_analytics_dashboard",{p_days:t});if(n)throw n;return e}export{l as A,_ as f,s as g,y as r,u as s};
