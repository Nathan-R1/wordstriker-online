package src;

import javax.swing.*;
import java.awt.*;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.net.UnknownHostException;

public class SocketClient {

    private BufferedReader in;
    private PrintWriter out;

    public void connect(String hostName, int portNumber, JLabel text) {

        System.out.println("Starting client'");

        try {
            Socket kkSocket = new Socket(hostName, portNumber);
            out = new PrintWriter(kkSocket.getOutputStream(), true);
            in = new BufferedReader(
                    new InputStreamReader(kkSocket.getInputStream()));

            String inputLine;

            while ((inputLine = in.readLine()) != null) {

                text.setText(inputLine);
            }


        } catch (UnknownHostException e) {
            System.err.println("Don't know about host " + hostName);
            System.exit(1);
        } catch (IOException e) {
            System.err.println("Couldn't get I/O for the connection to " +
                    hostName);
            System.exit(1);
        }
    }

    public void send(String send) {
        out.println(send);
    }
}
