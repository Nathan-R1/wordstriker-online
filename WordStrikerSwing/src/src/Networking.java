package src;

import javax.swing.*;
import java.awt.*;

public class Networking {

    public static final int PORT = 4444;

    private Boolean CLIENT = false;
    private SocketClient sc;
    private SocketServer ss;

    /**
     * Connect to the client or server protocol and make a new thread
     * @param host - the ip
     * @param text - the Jlabel to print incoming messages
     */
    public void connect(String host, JLabel text) {

        if (CLIENT) {
            sc = new SocketClient();
            // put into a thread so the gui still runs while we are listening
            Thread one = new Thread(() -> sc.connect(host, PORT, text));

            one.start();
        } else {
            ss = new SocketServer();
            // put into a thread so the gui still runs while we are listening
            Thread one = new Thread(() -> ss.connect(PORT, text));

            one.start();
        }
    }

    /*
     * send a message via the server or client protocol and then clear textfield
     */
    public void send(TextField t) {
        if (CLIENT) {
            if (sc != null) {
                sc.send(t.getText());
                t.setText("");
            }
        } else {
            if (ss != null) {
                ss.send(t.getText());
                t.setText("");
            }
        }
    }

    /*
     * toggle client status
     */
    public void setClient(boolean client) {
        CLIENT = client;
    }
}
