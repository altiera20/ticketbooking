import { Router } from 'express';
import { EventController } from '../controllers/event.controller';
import { validate } from '../middleware/validation.middleware';
import { 
  authenticate, 
  authorize, 
  requireEmailVerified,
  requireVendorVerified
} from '../middleware/auth.middleware';
import { UserRole } from '../types/common.types';

const router = Router();
const eventController = new EventController();

// Public routes
router.get('/', validate(eventController.getEventsSchema), eventController.getEvents);
router.get('/:id', validate(eventController.getEventByIdSchema), eventController.getEventById);

// Protected routes - Vendor only
router.use(authenticate);
router.use(requireEmailVerified);

// Create, update, delete events (vendor only)
router.post(
  '/',
  authorize(UserRole.VENDOR, UserRole.ADMIN),
  requireVendorVerified,
  validate(eventController.createEventSchema),
  eventController.createEvent
);

router.put(
  '/:id',
  authorize(UserRole.VENDOR, UserRole.ADMIN),
  requireVendorVerified,
  validate(eventController.updateEventSchema),
  eventController.updateEvent
);

router.delete(
  '/:id',
  authorize(UserRole.VENDOR, UserRole.ADMIN),
  requireVendorVerified,
  validate(eventController.deleteEventSchema),
  eventController.deleteEvent
);

export default router;
