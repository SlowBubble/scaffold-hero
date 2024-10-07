// NOTE: this library only works for source url that doesn't have any query param
// i.e. ?a=b. Instead it should use #a=b
// If you have to use ?, such as for local file, then?
// Pure functions
export function addKeyValToUrl(startingUrl: string, key: string, val: string) {
  const url = toInternalUrl(startingUrl);
  if (val !== undefined) {
    url.searchParams.set(key, val);
  } else {
    url.searchParams.delete(key);
  }
  return toExternalUrlStr(url);
}

export function toInternalUrl(externalUrlStr: string) {
  if (externalUrlStr.includes('?')) {
    // throw `URL should not contain ?: ${externalUrlStr}`;
    console.warn(`URL should not contain ?: ${externalUrlStr}`);
    externalUrlStr = externalUrlStr.replace('?', '');
  }
  return new URL(externalUrlStr.replace('#','?'));
}

export function toExternalUrlStr(internalUrl: URL) {
  internalUrl.searchParams.sort();
  return internalUrl.href.replace('?','#');
}

export function getUrlParamsMapFromString(urlStr: string) {
  const keyVals = new Map();
  if (!urlStr) {
    return keyVals;
  }
  const url = toInternalUrl(urlStr);
  url.searchParams.forEach(function(value, key) {
    keyVals.set(key, value);
  });
  return keyVals;
}

// Impure functions based on the document url and can mutate the document.
export function setUrlParam(key: string, val: string) {
  const externalUrlStr = addKeyValToUrl(document.URL, key, val);
  window.location.hash = externalUrlStr.includes('#') ? externalUrlStr.split('#')[1] : '';
}

export function getUrlParamsMap() {
  return getUrlParamsMapFromString(document.URL);
}