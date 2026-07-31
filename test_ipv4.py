import socket

try:
    infos = socket.getaddrinfo('db.vmukuxytracbdvdllstf.supabase.co', None, socket.AF_INET)
    print('IPv4:', infos[0][4][0])
except Exception as e:
    print('FAIL:', type(e).__name__, e)
