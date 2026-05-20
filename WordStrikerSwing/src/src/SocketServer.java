package src;

import javax.swing.*;
import java.awt.*;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;

public class SocketServer {

    private BufferedReader in;
    private PrintWriter out;

    public void connect(int portNumber, JLabel text) {


        System.out.println("Starting server'");

        try {
            ServerSocket serverSocket = new ServerSocket(portNumber);
            Socket clientSocket = serverSocket.accept();
            out = new PrintWriter(clientSocket.getOutputStream(), true);
            in = new BufferedReader(
                    new InputStreamReader(clientSocket.getInputStream()));

            out.println("--- Conversation Begins ---");

            String inputLine;

            while ((inputLine = in.readLine()) != null) {

                text.setText(inputLine);
            }

        } catch (IOException e) {
            System.out.println("Exception caught when trying to listen on port "
                    + portNumber + " or listening for a connection");
            System.out.println(e.getMessage());
        }
    }

    public void send(String send) {
        out.println(send);
    }
}
