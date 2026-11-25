const subtotal = (item) => item.quantity * item.unitPrice;
/** Total e ítems listos para guardar; lo usan la creación y la edición. */
export const construirItems = (items) => ({
    totalAmount: items.reduce((acc, item) => acc + subtotal(item), 0),
    items: {
        create: items.map((item) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: subtotal(item),
        })),
    },
});
