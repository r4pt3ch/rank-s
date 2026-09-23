export function usePagination(items, perPage = 20) {
  const page = ref(1);

  const totalPages = computed(() => Math.max(1, Math.ceil((items.value?.length || 0) / perPage)));

  const paged = computed(() => {
    const list = items.value || [];
    const start = (page.value - 1) * perPage;
    return list.slice(start, start + perPage);
  });

  function reset() { page.value = 1; }
  function next()  { if (page.value < totalPages.value) page.value++; }
  function prev()  { if (page.value > 1) page.value--; }

  watch(items, () => { page.value = 1; });

  return { page, totalPages, paged, next, prev, reset };
}
