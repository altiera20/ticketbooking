import { AppDataSource } from './config/database';
import { Event } from './models/Event.model';

async function listEvents() {
    try {
        await AppDataSource.initialize();
        const events = await AppDataSource.getRepository(Event).find();
        console.log('\nCurrent Events in Database:\n');
        events.forEach(event => {
            console.log(`- ${event.title} (${event.type})`);
            console.log(`  Date: ${event.eventDate}`);
            console.log(`  Location: ${event.venue}`);
            console.log(`  Price: Rs.${event.price}\n`);
        });
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await AppDataSource.destroy();
    }
}

listEvents(); 