<template>
  <div style="display:flex; flex-direction:column; min-height:100vh; background:var(--bg);">
    <OsNav />
    <div style="flex:1; display:flex; flex-direction:column; overflow:hidden;">
      <slot />
    </div>
  </div>
</template>
