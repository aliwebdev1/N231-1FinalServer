const express = require('express');
const cors = require('cors');
const fileUpload = require('express-fileupload')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 3000

const app = express()

//midleware
app.use(cors());
app.use(express.json());
app.use(fileUpload())

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.guep9xh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        const database = client.db('231-1DoctorsPortal');
        const appointmentOptionCollection = database.collection('appointmentOptions');
        const bookingCollection = database.collection('Bookings')
        const usersCollection = database.collection('Users')
        const doctorCollection = database.collection('Doctors')

        app.get('/appointmentOptions', async (req, res) => {
            const date = req.query.date;
            const query = {};
            const options = await appointmentOptionCollection.find(query).toArray();

            const bookingQuery = { appointmentDate: date }
            const alredyBooked = await bookingCollection.find(bookingQuery).toArray();

            options.forEach(option => {
                const optionBooked = alredyBooked.filter(book => book.treatment === option.name);
                const bookedSlots = optionBooked.map(book => book.slot);

                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot));
                option.slots = remainingSlots;

            })
            res.send(options)
        })

        // get only specific one item from database collection

        app.get('/appointmentSpecialty', async (req, res) => {
            const query = {};
            const result = await appointmentOptionCollection.find(query).project({ name: 1 }).toArray();
            res.send(result)
        })


        app.post('/bookings', async (req, res) => {
            const bookings = req.body;
            const query = {
                appointmentDate: bookings.appointmentDate,
                email: bookings.email,
                treatment: bookings.treatment
            }

            const alreadyBooked = await bookingCollection.find(query).toArray();
            if (alreadyBooked.length) {
                const message = `You have a booking on ${bookings.appointmentDate}, you can try another day`
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingCollection.insertOne(bookings);
            res.send(result)
        })

        // specific user appointment
        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings)
        })


        // user saved 
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        // user get
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users)
        })


        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send({ isAdmin: user?.role === 'admin' })
        })


        // update specific user 
        app.put('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options);
            res.send(result)
        })




        // doctor
        app.get('/doctors', async (req, res) => {
            const query = {};
            const doctors = await doctorCollection.find(query).toArray();
            res.send(doctors)
        })

        // app.post('/doctors', async (req, res) => {
        //     const doctor = req.body;
        //     const result = await doctorCollection.insertOne(doctor);
        //     res.send(result)
        // })

        app.post('/doctors', async (req, res) => {
            const name = req.body.name;
            const email = req.body.email;

            const pic = req.files.image;
            const picData = pic.data;
            const enCodedPic = picData.toString('base64');
            const imageBuffer = Buffer.from(enCodedPic, 'base64');
            const doctor = {
                name,
                email,
                image: imageBuffer
            }
            const result = await doctorCollection.insertOne(doctor);
            res.send(result)
        })



        app.delete('/doctors/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const result = await doctorCollection.deleteOne(filter);
            res.send(result)

        })





    } finally {

    }
}
run().catch(console.dir);






app.get('/', (req, res) => {
    res.send('Doctors Portal is ready!')
})

app.listen(port, () => {
    console.log(`Our Doctros Portal run on port ${port}`)
})