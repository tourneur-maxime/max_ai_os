<template>
  <nav class="os-nav">
    <div class="brand-mark">Max OS — 1</div>
    <div class="brand-sub">local-first</div>
    <div class="nav-links">
      <NuxtLink to="/" class="nav-link" exact-active-class="router-link-exact-active">Visualizer</NuxtLink>
      <NuxtLink to="/agents" class="nav-link" active-class="router-link-active">Agents</NuxtLink>
      <NuxtLink to="/memory" class="nav-link" exact-active-class="router-link-exact-active">Memory</NuxtLink>
      <NuxtLink to="/missions" class="nav-link" exact-active-class="router-link-exact-active">Missions</NuxtLink>
      <NuxtLink to="/kanban" class="nav-link" exact-active-class="router-link-exact-active">Kanban</NuxtLink>
      <NuxtLink to="/skills" class="nav-link" exact-active-class="router-link-exact-active">Skills</NuxtLink>
      <NuxtLink to="/dashboard" class="nav-link" exact-active-class="router-link-exact-active">Dashboard</NuxtLink>
      <NuxtLink to="/channels" class="nav-link" exact-active-class="router-link-exact-active">Channels</NuxtLink>
      <NuxtLink to="/remote" class="nav-link" exact-active-class="router-link-exact-active">Remote</NuxtLink>
      <NuxtLink to="/scheduler" class="nav-link" exact-active-class="router-link-exact-active">Scheduler</NuxtLink>
    </div>
    <div class="nav-spacer"></div>
    <div class="nav-stats">
      <span><b>3</b> active</span>
      <span><b>$0.34</b> today</span>
    </div>
    <div class="user-pill">M</div>
  </nav>
</template>
