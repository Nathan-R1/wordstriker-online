package src;

import javax.swing.*;
import java.awt.*;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;
import java.net.InetAddress;

public class Gui {

    private final String LOCALHOST = "localhost";

    public void launch() {

        Networking n = new Networking();

        // create frame
        JFrame j = new JFrame("Chat Messenger App");

        j.setSize(500, 400);
        j.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);

        // create elements
        Button b = new Button("Connect");
        JButton sendButton = new JButton("Send");
        TextField t = new TextField("...");
        JLabel incoming = new JLabel();
        JCheckBox client = new JCheckBox("Client");
        JComboBox c = new JComboBox();
        populate(c);


        // bind action listeners
        b.addActionListener(e -> {
            n.connect((String)c.getSelectedItem(), incoming);
        });
        sendButton.addActionListener(e -> {
            n.send(t);
        });
        client.addActionListener(e -> {
            n.setClient(client.isSelected());
        });
        j.getRootPane().setDefaultButton(sendButton);

        // set locations of elements
        c.setLocation(0,0);
        c.setSize(120, 100);
        b.setLocation(130,0);
        b.setSize(120, 100);
        client.setLocation(260, 20);
        client.setSize(100, 50);

        t.setLocation(70,200);
        t.setSize(120, 100);
        sendButton.setLocation(200, 200);
        sendButton.setSize(120, 80);

        incoming.setSize(400, 80);
        incoming.setLocation(100, 150);

        // add elements to teh JFrame
        j.setLayout(null);
        j.add(b);
        j.add(client);
        j.add(t);
        j.add(sendButton);
        j.add(c);
        j.add(incoming);

        j.setVisible(true);

    }

    /*
     * A method that populates the given combo box with items that are:
     *  - a list of all local IP addresses that can be contacted on your LAN (1000 millesecond ping time)
     */
    private void populate(JComboBox comboBox) {
        // clear and normalize the list
        comboBox.removeAllItems();
        comboBox.addItem(LOCALHOST);
        comboBox.setSelectedIndex(0); // local host is selected by default

        final byte[] ip;
        try {
            ip = InetAddress.getLocalHost().getAddress();
        } catch (Exception e) {
            return;     // exit method, otherwise "ip might not have been initialized"
        }

        for(int i=1;i<=254;i++) {
            final int j = i;  // i as non-final variable cannot be referenced from inner class
            // new thread for parallel execution
            new Thread(() -> {
                try {
                    ip[3] = (byte)j;
                    InetAddress address = InetAddress.getByAddress(ip);
                    String output = address.toString().substring(1);
                    if (address.isReachable(1000)) {
                        comboBox.addItem(output);
                    } else {
                        System.out.println("Not Reachable: "+output);
                    }
                } catch (Exception e) {
                    System.out.println("Catch: " + e.getMessage());
                }
            }).start();     // dont forget to start the thread
        }

    }

}
