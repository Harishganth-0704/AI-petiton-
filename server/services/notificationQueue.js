import { emailService } from './emailService.js';
import { smsService } from './smsService.js';

class NotificationQueue {
    constructor() {
        this.queue = [];
        this.maxRetries = 3;
        this.backoffMs = 5000; // 5 seconds initial backoff
        this.isProcessing = false;
    }

    /**
     * Add a notification task to the queue
     * @param {Object} task - { type: 'email'|'sms', user, petition, data, retryCount: 0 }
     */
    async enqueue(type, user, petition, statusOrRemark, optionalRemark) {
        const task = {
            type,
            user,
            petition,
            statusOrRemark, 
            optionalRemark,
            retryCount: 0,
            nextAttempt: Date.now()
        };
        this.queue.push(task);
        console.log(`[Queue] Enqueued ${type} for ${user.email || user.phone}. Queue size: ${this.queue.length}`);
        
        if (!this.isProcessing) {
            this.processQueue();
        }
    }

    async processQueue() {
        if (this.queue.length === 0) {
            this.isProcessing = false;
            return;
        }

        this.isProcessing = true;
        const now = Date.now();
        
        // Filter tasks ready for attempt
        const tasksToProcess = this.queue.filter(t => t.nextAttempt <= now);
        
        for (const task of tasksToProcess) {
            // Remove from queue for processing
            this.queue = this.queue.filter(t => t !== task);
            
            let success = false;
            try {
                if (task.type === 'email') {
                    success = await emailService.sendStatusUpdate(
                        task.user, 
                        task.petition, 
                        task.statusOrRemark, 
                        task.optionalRemark
                    );
                } else if (task.type === 'sms') {
                    success = await smsService.sendStatusUpdateSMS(
                        task.user, 
                        task.petition, 
                        task.statusOrRemark, 
                        task.optionalRemark
                    );
                }
            } catch (err) {
                console.error(`[Queue] Critical Error processing ${task.type}:`, err);
                success = false;
            }

            if (success) {
                console.log(`[Queue] Success: ${task.type} delivered to ${task.user.email || task.user.phone}`);
            } else {
                task.retryCount++;
                if (task.retryCount <= this.maxRetries) {
                    const delay = this.backoffMs * Math.pow(2, task.retryCount - 1);
                    task.nextAttempt = Date.now() + delay;
                    this.queue.push(task);
                    console.warn(`[Queue] Failed: ${task.type} to ${task.user.email || task.user.phone}. Retry ${task.retryCount}/${this.maxRetries} in ${delay/1000}s`);
                } else {
                    console.error(`[Queue] Final Failure: ${task.type} dropped for ${task.user.email || task.user.phone} after ${this.maxRetries} retries.`);
                }
            }
        }

        // Schedule next check if queue not empty
        if (this.queue.length > 0) {
            setTimeout(() => this.processQueue(), 2000);
        } else {
            this.isProcessing = false;
        }
    }
}

export const notificationQueue = new NotificationQueue();
