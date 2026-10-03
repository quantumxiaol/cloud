export function requiredElement<T extends HTMLElement = HTMLElement>(
  selector: string,
  root: ParentNode = document,
): T {
  const element = root.querySelector<T>(selector)
  if (!element) throw new Error(`Required element not found: ${selector}`)
  return element
}
