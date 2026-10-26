import { Router } from 'express';
import { adminRacesRouter } from './races.routes';
import { adminUsersRouter } from './users.routes';
import { adminSettingsRouter } from './settings.routes';
import { adminLogsRouter } from './logs.routes';

export const adminRouter = Router();

adminRouter.use('/races', adminRacesRouter);
adminRouter.use('/users', adminUsersRouter);
adminRouter.use('/settings', adminSettingsRouter);
adminRouter.use('/logs', adminLogsRouter);
