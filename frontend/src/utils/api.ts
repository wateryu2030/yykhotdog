export async function getJSON<T=any>(url:string, params:Record<string,any>={}):Promise<T>{
  const qs=Object.entries(params).filter(([_,v])=>v!==undefined&&v!==null&&v!=='').map(([k,v])=>`${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`).join('&');
  const u=qs?`${url}?${qs}`:url;
  const res=await fetch(u);
  if(!res.ok) throw new Error(`Request failed: ${res.status}`);
  return res.json();
}
export const getJSONWithParams = getJSON;
