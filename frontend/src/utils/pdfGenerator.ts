import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VentaResponse, Venta } from '../modules/sales/types';
import { Settings } from '../modules/settings/types';

interface BusinessInfo {
    name: string;
    address?: string;
    city?: string;
    phone?: string;
    email?: string;
    website?: string;
}

export const generateSaleReceiptPDF = (
    saleData: VentaResponse,
    businessInfo: BusinessInfo,
    customerInfo?: {
        name?: string;
        address?: string;
        city?: string;
        phone?: string;
    }
) => {
    const doc = new jsPDF();
    
    // Set up document properties
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    let yPosition = margin;

    // Header
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(businessInfo.name, margin, yPosition);
    
    yPosition += 10;
    
    // Business address
    if (businessInfo.address || businessInfo.city) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const addressLines: string[] = [];
        if (businessInfo.address) addressLines.push(businessInfo.address);
        if (businessInfo.city) addressLines.push(businessInfo.city);
        
        addressLines.forEach(line => {
            doc.text(line || '', margin, yPosition);
            yPosition += 6;
        });
        yPosition += 4;
    }

    // Contact information
    if (businessInfo.phone || businessInfo.email || businessInfo.website) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const contactLines: string[] = [];
        if (businessInfo.phone) contactLines.push(`Tel: ${businessInfo.phone}`);
        if (businessInfo.email) contactLines.push(`Email: ${businessInfo.email}`);
        if (businessInfo.website) contactLines.push(`Web: ${businessInfo.website}`);
        
        contactLines.forEach(line => {
            doc.text(line || '', margin, yPosition);
            yPosition += 6;
        });
        yPosition += 8;
    }

    // Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROBANTE DE VENTA', pageWidth / 2, yPosition, { align: 'center' });
    yPosition += 12;

    // Sale information
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const saleDate = new Date(saleData.venta.fecha).toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    doc.text(`Número de Venta: ${saleData.venta.id}`, margin, yPosition);
    doc.text(`Fecha: ${saleDate}`, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 8;

    // Customer information
    if (customerInfo?.name || customerInfo?.address || customerInfo?.city || customerInfo?.phone) {
        yPosition += 4;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('DATOS DEL CLIENTE', margin, yPosition);
        yPosition += 8;
        
        doc.setFont('helvetica', 'normal');
        if (customerInfo.name) {
            doc.text(`Nombre: ${customerInfo.name || ''}`, margin, yPosition);
            yPosition += 6;
        }
        if (customerInfo.address) {
            doc.text(`Dirección: ${customerInfo.address || ''}`, margin, yPosition);
            yPosition += 6;
        }
        if (customerInfo.city) {
            doc.text(`Ciudad: ${customerInfo.city || ''}`, margin, yPosition);
            yPosition += 6;
        }
        if (customerInfo.phone) {
            doc.text(`Teléfono: ${customerInfo.phone || ''}`, margin, yPosition);
            yPosition += 8;
        }
    }

    yPosition += 4;

    // Items table
    const tableColumn = ["Cant.", "Descripción", "Precio Unit.", "Subtotal"];
    const tableRows: string[][] = [];

    saleData.items.forEach(item => {
        const descripcion = item.producto_nombre || `Producto ${item.producto_id}`;
        const precioUnit = item.costo ? `$${item.costo.toFixed(2)}` : 'N/A';
        const subtotal = item.subtotal ? `$${item.subtotal.toFixed(2)}` : 'N/A';
        
        const itemData = [
            item.cantidad.toString(),
            descripcion,
            precioUnit,
            subtotal
        ];
        tableRows.push(itemData);
    });

    autoTable(doc, {
        startY: yPosition,
        head: [tableColumn],
        body: tableRows,
        theme: 'striped',
        headStyles: {
            fillColor: [0, 123, 255],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold'
        },
        bodyStyles: {
            fontSize: 9
        },
        columnStyles: {
            0: { cellWidth: 20, halign: 'center' },
            1: { cellWidth: 100 },
            2: { cellWidth: 40, halign: 'right' },
            3: { cellWidth: 40, halign: 'right' }
        },
        margin: { left: margin, right: margin }
    });

    yPosition = (doc as any).lastAutoTable.finalY + 10;

    // Totals
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    const totalText = `TOTAL: $${saleData.venta.total.toFixed(2)}`;
    doc.text(totalText, pageWidth - margin, yPosition, { align: 'right' });
    yPosition += 12;

    // Footer
    yPosition += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text('Gracias por su compra', pageWidth / 2, yPosition, { align: 'center' });

    // Save the PDF
    const fileName = `comprobante-venta-${saleData.venta.id}-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(fileName);
};

// Helper function to format business info from settings
export const formatBusinessInfo = (settings: Settings): BusinessInfo => {
    return {
        name: settings.company_name || 'Empresa',
        address: settings.business_address,
        city: settings.business_city,
        phone: settings.business_phone,
        email: settings.business_email,
        website: settings.business_website
    };
};

// Helper function to format customer info from sale
export const formatCustomerInfo = (venta: Venta) => {
    if (!venta.cliente_nombre) return undefined;
    
    return {
        name: venta.cliente_nombre,
        address: venta.cliente_domicilio,
        city: venta.cliente_localidad,
        phone: venta.cliente_telefono
    };
};
