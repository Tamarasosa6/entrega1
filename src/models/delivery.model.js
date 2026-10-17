import mongoose from 'mongoose';
import { DELIVERY_STATUS } from '../constants/index.js';

const deliverySchema = new mongoose.Schema(
  {
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      unique: true, // una entrega por pedido
    },
    // null mientras la entrega no tiene repartidor asignado
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    status: {
      type: String,
      enum: Object.values(DELIVERY_STATUS),
      default: DELIVERY_STATUS.PENDING,
    },
    address: { type: String, required: true, trim: true },
    scheduledDate: { type: Date, required: true },
    deliveredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

export const DeliveryModel = mongoose.model('Delivery', deliverySchema);
