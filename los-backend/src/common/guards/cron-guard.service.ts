import { Injectable, Logger } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';

/**
 * CronGuard Service
 * 
 * Conditionally enables/disables cron jobs based on environment configuration.
 * This is used in PM2 cluster mode to ensure cron jobs only run on dedicated worker,
 * not on every cluster instance.
 */
@Injectable()
export class CronGuardService {
  private readonly logger = new Logger(CronGuardService.name);
  private readonly enableCronJobs: boolean;

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {
    this.enableCronJobs = process.env.ENABLE_CRON_JOBS === 'true';
    
    if (this.enableCronJobs) {
      this.logger.log('✅ Cron jobs ENABLED on this instance');
    } else {
      this.logger.warn('⚠️ Cron jobs DISABLED on this instance (cluster worker mode)');
    }
  }

  /**
   * Check if cron jobs should be enabled
   */
  isCronEnabled(): boolean {
    return this.enableCronJobs;
  }

  /**
   * Get enabled status for logging
   */
  getStatus(): { enabled: boolean; isCronWorker: boolean } {
    return {
      enabled: this.enableCronJobs,
      isCronWorker: process.env.CRON_WORKER === 'true',
    };
  }

  /**
   * Disable all scheduled cron jobs
   * Useful for cluster workers that should not run crons
   */
  disableAllCrons(): void {
    if (this.enableCronJobs) {
      this.logger.debug('Skipping cron disablement - crons are enabled');
      return;
    }

    try {
      const crons = this.schedulerRegistry.getCronJobs();
      
      crons.forEach((job, jobName) => {
        try {
          job.stop();
          this.logger.log(`✓ Stopped cron job: ${jobName}`);
        } catch (error) {
          this.logger.warn(`Could not stop cron job ${jobName}:`, error.message);
        }
      });

      const intervals = this.schedulerRegistry.getIntervals();
      intervals.forEach((interval, intervalName) => {
        try {
          clearInterval(interval);
          this.logger.log(`✓ Cleared interval: ${intervalName}`);
        } catch (error) {
          this.logger.warn(`Could not clear interval ${intervalName}:`, error.message);
        }
      });

      const timeouts = this.schedulerRegistry.getTimeouts();
      timeouts.forEach((timeout, timeoutName) => {
        try {
          clearTimeout(timeout);
          this.logger.log(`✓ Cleared timeout: ${timeoutName}`);
        } catch (error) {
          this.logger.warn(`Could not clear timeout ${timeoutName}:`, error.message);
        }
      });

      this.logger.log('🛑 All scheduled jobs have been disabled');
    } catch (error) {
      this.logger.error('Error disabling cron jobs:', error);
    }
  }
}
