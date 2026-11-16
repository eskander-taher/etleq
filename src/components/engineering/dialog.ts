let supportsExit: boolean | undefined

/** Test actual display-transition behavior; parsing support alone is insufficient. */
function supportsNativeExit() {
  if (supportsExit !== undefined) return supportsExit
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;visibility:hidden;transition:display 1s allow-discrete !important;display:block'
  document.body.append(probe)
  void getComputedStyle(probe).display
  probe.style.display = 'none'
  supportsExit = CSS.supports('overlay', 'auto') && getComputedStyle(probe).display === 'block'
  probe.remove()
  return supportsExit
}

/** Preserve the top layer until exit finishes on browsers without native support. */
export async function closeAuditDialog(dialog: HTMLDialogElement | null) {
  if (!dialog?.open || dialog.hasAttribute('data-closing')) return
  if (supportsNativeExit()) {
    dialog.close()
    return
  }
  dialog.setAttribute('data-closing', '')
  void getComputedStyle(dialog).opacity
  let timeout: ReturnType<typeof setTimeout> | undefined
  await Promise.race([
    Promise.allSettled(dialog.getAnimations({ subtree: true }).map((animation) => animation.finished)),
    new Promise<void>((resolve) => {
      timeout = setTimeout(resolve, 2000)
    }),
  ])
  clearTimeout(timeout)
  if (dialog.hasAttribute('data-closing')) {
    dialog.removeAttribute('data-closing')
    dialog.close()
  }
}
