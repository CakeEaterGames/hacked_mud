

const removeStartSlash = (str: string): string => str.startsWith('/') ? str.slice(1) : str;
const removeEndSlash = (str: string): string => str.endsWith('/') ? str.slice(0, -1) : str;


/**
 * Удаляет или добавляет "/" в начале и в конце строки
 * @example ("/pages/stuff/"",true,false) -> "/pages/stuff"
 */
export function needSlash(url: string, start = false, end = false) {
  url = removeStartSlash(url)
  url = removeEndSlash(url)
  if (start) url = "/" + url
  if (end) url += "/"
  return url
}

/**
 * Удаляет "/" в начале и в конце строки
 * @param url /pages/stuff/
 * @returns pages/stuff
 */
export function removeSlashes(url:string){
  return needSlash(url, false, false)
}