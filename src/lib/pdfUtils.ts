import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CartItem } from '@/stores/cartStore'

interface ReceiptData {
    items: CartItem[]
    total: number
    paymentMethod: string
    receivedAmount: number
    change: number
    date: string
    ticketId: string
}

export const generateReceipt = (data: ReceiptData) => {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(18)
    doc.text('TLAPALERÍA BLAS', 105, 20, { align: 'center' })

    doc.setFontSize(10)
    doc.text('Calle Falsa 123, Ciudad de México', 105, 28, { align: 'center' })
    doc.text('Tel: 55-1234-5678', 105, 33, { align: 'center' })
    doc.text(`Fecha: ${data.date}`, 15, 45)
    doc.text(`Ticket: #${data.ticketId.slice(0, 8).toUpperCase()}`, 15, 50)

    // Items Table
    const tableColumn = ["Cant", "Producto", "P.Unit", "Importe"]
    const tableRows = data.items.map(item => [
        item.quantity,
        item.name,
        `$${item.price_regular.toFixed(2)}`,
        `$${item.subtotal.toFixed(2)}`
    ])

    autoTable(doc, {
        startY: 55,
        head: [tableColumn],
        body: tableRows,
        theme: 'plain',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [220, 220, 220], textColor: 0, fontStyle: 'bold' }
    })

    // Totals
    const finalY = (doc as any).lastAutoTable.finalY + 10

    doc.setFontSize(11)
    doc.text(`TOTAL:     $${data.total.toFixed(2)}`, 140, finalY)
    doc.text(`Recibido:  $${data.receivedAmount.toFixed(2)}`, 140, finalY + 6)
    doc.text(`Cambio:    $${data.change.toFixed(2)}`, 140, finalY + 12)

    // Footer
    doc.setFontSize(9)
    doc.text('¡Gracias por su compra!', 105, finalY + 30, { align: 'center' })

    // Save
    doc.save(`ticket_${data.ticketId.slice(0, 8)}.pdf`)
}
