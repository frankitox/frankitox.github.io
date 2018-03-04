---
layout: post
title: "Redux with re-frame effects"
largeTitle: "Re-frame effects implemented as a Redux's middleware"
description: "Or how I tried to recreate re-frame as a Redux's middleware"
date: 2018-03-02
tags: [reframe, react, redux, sagas]
comments: true
share: true
---

In this, hopefully, short article, I would like to discuss on an alternative
approach to solve effects (e.g: API Calls, writing cookies, etc.) when working
with react and redux. Replacing <a target="_blank" href="https://github.com/redux-saga/redux-saga">sagas</a> with <a target="_blank" href="https://github.com/Day8/re-frame">re-frame</a>.
You still there? Then I'll give it a try:

Let's build a constrained example in which we need to fetch a list of users.
The usual way to structure your code with react, redux and sagas is to write
a component, a reducer and a watcher, right? Then, sketching a component:

<pre>
class UsersList
  componentDidMount()
    this.props.dispatch({ type: GET_USERS })
  render()
    &lt;div className="user-list"&gt;
      map(this.props.users, user =&gt;
        &lt;div key={user.id}&gt;
          user.name
        &lt;/div&gt;)
      this.props.fetching &&
        &lt;p&gt;Loading&lt;/p&gt;
    &lt;/div&gt;
connect()(UsersList)
</pre>

Once the connected component gets mounted, we dispatch the `GET_USERS`
action, that will set the `fetching` property to `true`.

<pre>
const initialState = {
  fetching: false
  users: []
}
const reducer = (state = initialState, action) => {
  const { type, payload } = action;
  switch (type) {
    case 'GET_USERS':
      return {
        ...state
        fetching: true
      }
    case 'GET_USERS_SUCCESS':
      return {
        ...state
        users: payload.users
      }
  }
}
</pre>

Then, using sagas we could intercept the `GET_USERS` to make an HTTP GET request
and dispatch a `GET_USERS_SUCCESS` with the results.

<pre>
function* getUsersWorker() {
  const users = yield fetch('users-endpoint')
  yield put({
    type: GET_USERS_SUCCESS
    payload: { users }
  })
}

export function* getUsersWatcher() {
  yield takeEvery(GET_USERS, getUsersWorker)
}
</pre>

There. That's how is done with sagas. Now, re-frame's approach will be to
write all the logic in the reducer:

```
export const initialState = {
  fetching: false
  users: []
};
export default {
  GET_USERS: ({ state = initialState }) => ({
    state: {
      ...state
      fetching: true
    },
    httpGet: {
      path: 'users-endpoint'
      then: { type: GET_USERS_SUCCESS }
    },
  }),
  GET_USERS_SUCCESS: ({ state = initialState }, payload) => ({
    state: {
      ...state
      users: payload.users
    }
  })
}
```

As you can see, now we return the next state wrapped in another object. Now,
Redux will update the state with what is in the `state` key, but what's the
other key (`httpGet`) about? It's an effect. In other words, a non pure function.
Re-frame gives you a way to register new effects, let's register `httpGet`:

```
regFx('httpGet', (params, dispatch) => {
  const { path, then } = params;
  fetch(params.path).then(response => {
    dispatch({
      ...then,
      payload: response,
    })
  });
});
```

The second parameter of `regFx` is a function which carries as arguments:
first the value of the key `httpGet` in the reducer, and the `dispatch`
function provided by Redux to emit an event with the response.

Now, let's be honest, this is a pretty constrained example and both approaches
seem quite similar. Let's analyze a bit this example, with different scenarios:

Imagine you need to send a bunch of data from the state to `getUsersAPI`. If
you are working with sagas, then you can use the `select` function to get the
state after it has been processed or you can send all the state you
need in the payload, which is, usually, the preferred way. Now, working with
re-frame, you have access to all the state in the current scope before the
state transition. That way your logged payloads will carry only relevant information.

What about testing? because of It's use of function generators sagas is very testable,
you can inspect each `yield` statement. Instead, if you create a re-frame effect
that makes several api calls, you don't have the same granular control and that's
why effects should be as simple as possible. In a positive note, in re-frame
you're encouraged to write your side effects as data in the reducers, in other
words, a more declarative approach. You also have single point of control for
every effect implementation.

Another good point to re-frame is that, using an explicit registration function,
you can keep track of each type, and console a warning when there's an action
dispatched with no handler.

This discussion only concerns re-frame effects, but there's another concept called
coeffects which allow us to read other mutable data besides Redux state (e.g:
current time). Also I don't provide any implementation for re-frame, nevertheless
if you are interested, the <a target="_blank" href="https://github.com/Day8/re-frame/tree/master/src/re_frame">source code</a> is quite elegant.

Finally, this is a subjective comparison between both models and any thoughts or
arguments against or in favor are highly appreciated.
