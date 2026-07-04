# Push Notification System — Flow Documentation

## App Start

```text
APP START
  load .env
  create ApiClient
  create PushNotificationService(apiClient)

  PushNotificationService.initialize()
    if platform is not Android:
      return

    Firebase.initializeApp()
    FirebaseMessaging.onBackgroundMessage(backgroundHandler)

    create Android notification channel "manga_notifications"

    localNotifications.initialize(
      onLocalNotificationTap:
        route = routeFromPayload(payload)
        emit route
    )

    FirebaseMessaging.onMessage:
      show foreground local notification

    FirebaseMessaging.onMessageOpenedApp:
      route = routeFromData(message.data)
      emit route

    FirebaseMessaging.getInitialMessage:
      if app was opened from notification:
        route = routeFromData(message.data)
        emit route

    FirebaseMessaging.onTokenRefresh:
      registerTokenWithBackend(newToken)

  create AppState(..., pushNotificationService)

  runApp()
  appState.restore()
```

## Session Restore / Login

```text
SESSION RESTORE / LOGIN
  user = restoreSession() OR login(email, password)

  if user exists:
    pushNotificationService.onSignedIn()

  PushNotificationService.onSignedIn()
    if platform is not Android:
      return

    initialize() if not initialized

    permission = FirebaseMessaging.requestPermission()
    log permission status

    token = FirebaseMessaging.getToken()
    if token is null:
      log "token is null"
      return

    POST /api/push-tokens
      Authorization: Bearer accessToken
      body:
        token: token
        platform: "android"

    backend stores token
```

## Backend: Register Token

```text
BACKEND REGISTER TOKEN
  POST /api/push-tokens
    authenticate user

    validate body:
      token: string
      platform: android | ios | web
      deviceId?: string
      appVersion?: string

    prisma.pushDeviceToken.upsert(
      where token = body.token

      if exists:
        update:
          userId = currentUser.id
          platform = body.platform
          deviceId = body.deviceId
          appVersion = body.appVersion
          lastSeenAt = now
          revokedAt = null

      if new:
        create:
          userId = currentUser.id
          token = body.token
          platform = body.platform
          deviceId = body.deviceId
          appVersion = body.appVersion
          lastSeenAt = now
    )

    return stored token metadata
```

## When a Notification Event Happens

```text
WHEN A NOTIFICATION EVENT HAPPENS
  example:
    another user replies to comment
    another user reacts to comment
    friend request is sent
    group invite is created
    missed call timeout happens

  backend creates Notification row:
    userId = recipient user
    actorId = user who caused event
    type = COMMENT_REPLY | FRIEND_REQUEST | ...
    subjectType = COMMENT | FRIENDSHIP | CONVERSATION | CALL
    subjectId = related entity id
    payload = routing metadata
    readAt = null

  publishNotification(notification)
```

## Backend: Publish Notification

```text
BACKEND PUBLISH NOTIFICATION
  publishNotification(notification)
    emit Socket.io event to user room:
      "notification:new"

    deliverPushNotification(notification)

    emit SSE event to in-app notification stream listeners
```

## Backend: Deliver Push

```text
BACKEND DELIVER PUSH
  deliverPushNotification(notification)
    firebaseApp = getFirebaseApp()

    if Firebase Admin credentials are missing:
      return

    if notification.type == CHAT_MESSAGE:
      check recipient conversation membership
      if mutedUntil > now:
        return

    tokens = prisma.pushDeviceToken.findMany(
      where:
        userId = notification.userId
        revokedAt = null
    )

    if no tokens:
      return

    copy = buildPushTitleAndBody(notification.type)
    data = buildRoutingData(notification)

    for each token:
      FirebaseMessaging.send(
        token = token.value
        notification:
          title = copy.title
          body = copy.body
        data = data
        android:
          priority = high
          channelId = "manga_notifications"
      )

      if Firebase says token invalid:
        mark PushDeviceToken.revokedAt = now

      if other send error:
        log failure
```

## Push Payload Data

```text
PUSH PAYLOAD DATA
  always include:
    notificationId
    type
    subjectType
    subjectId
    createdAt

  include when available:
    commentId
    targetType
    targetId
    conversationId
    messageId
    callId
```

## Mobile Receives Push (Foreground)

```text
MOBILE RECEIVES PUSH WHILE FOREGROUND
  FirebaseMessaging.onMessage(message)
    notification = message.notification

    if notification exists:
      localNotifications.show(
        channel = "manga_notifications"
        title = notification.title
        body = notification.body
        payload = jsonEncode(message.data)
      )

  user taps local notification:
    data = jsonDecode(payload)
    route = routeFromData(data)
    router.go(route)
```

## Mobile Receives Push (Background / Killed)

```text
MOBILE RECEIVES PUSH WHILE BACKGROUND / KILLED
  Android system displays FCM notification

  user taps notification

  FirebaseMessaging.onMessageOpenedApp OR getInitialMessage fires

  route = routeFromData(message.data)
  router.go(route)
```

## Route From Push Data

```text
ROUTE FROM PUSH DATA
  routeFromData(data)
    if targetType == "MANGA":
      return "/manga/{targetId}"

    if targetType == "CHAPTER":
      return "/read/{targetId}"

    if type is FRIEND_REQUEST:
      return "/messages"

    if type is FRIEND_ACCEPTED:
      return "/messages"

    if type is GROUP_INVITE:
      return "/messages"

    if type is CHAT_MESSAGE:
      return "/messages"

    if type is MISSED_CALL:
      return "/messages"

    if subjectType is CONVERSATION or CALL:
      return "/messages"

    return null
```

## Logout

```text
LOGOUT
  appState.logout()
    pushNotificationService.onSignedOut()

  PushNotificationService.onSignedOut()
    token = lastRegisteredToken OR FirebaseMessaging.getToken()

    if token exists:
      POST /api/push-tokens/unregister
        Authorization: Bearer accessToken
        body:
          token: token

    authRepository.logout()
    clear local auth tokens
```

## Backend: Unregister Token

```text
BACKEND UNREGISTER TOKEN
  POST /api/push-tokens/unregister
    authenticate user

    validate body.token

    prisma.pushDeviceToken.updateMany(
      where:
        userId = currentUser.id
        token = body.token
        revokedAt = null
      data:
        revokedAt = now
    )

    return ok
```
