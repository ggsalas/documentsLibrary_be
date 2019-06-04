const router = require('express').Router()
const passport = require('passport')
const GoogleStrategy = require('passport-google-oauth20')
const jwt = require('jsonwebtoken')

const User = require('../models/user')

const CALLBACK_URL_DEV = 'http://localhost:8080/auth/google/callback'

module.exports = {
  set(app) {
    passport.use(new GoogleStrategy({
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: CALLBACK_URL_DEV
    }, async (accessToken, refreshToken, profile, cb) => {
      let user = await User.findOne({ googleID: profile.id })

      if (user === null) {
        user = new User({
          googleID: profile.id,
          displayName: profile.displayName || profile.name.givenName,
          name: {
            lastName: profile.name.familyName,
            firstName: profile.name.givenName
          },
          email: validEmail(profile),
          photo: {
            original: profile.photos.length ? profile.photos[0].value : null,
          }
        })

        await user.save()
      }

      cb(null, user.toObject())
    }))

    passport.serializeUser((user, done) => done(null, user))
    passport.deserializeUser((user, done) => done(null, user))

    app.use(passport.initialize())
    app.get('/auth/google',
      passport.authenticate('google', { scope: ['profile', 'email'] })
    )

    app.get('/auth/google/callback',
      passport.authenticate('google', { failureRedirect: '/login' }),
      (req, res) => {
        const token = jwt.sign({ _id: req.user._id }, process.env.TOKEN_SECRET)
        res.header('auth-token', token).send({...req.user, token})
      }
    )
  }
}

function validEmail (profile) {
  const emails = profile.emails.filter(e => e.verified == true)

  if(emails.length) {
    return emails[0].value
  } else {
    return profile.emails[0].value
  }
}

