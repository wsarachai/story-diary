document.addEventListener("click", (event) => {
    const target = event.target;

    if (!(target instanceof Element)) {
        return;
    }

    const button = target.closest("[data-navigate]");

    if (!(button instanceof HTMLElement)) {
        return;
    }

    const destination = button.dataset.navigate;

    if (!destination) {
        return;
    }

    window.location.href = destination;
});